import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { streamChat } from '../utils/aiApi'
import { patchSkill } from '../context/index'
import './ChatPanel.css'

const QUICK_PROMPTS = [
  '帮我写一个点亮屏幕显示"Hello World"的完整例程',
  '帮我写一个读取QMI8658加速度计数据的代码',
  '帮我写一个播放MP3音乐的主函数',
  '帮我实现WiFi扫描并连接功能',
  '帮我写一个摄像头实时显示到LCD的例程',
  '生成完整的idf_component.yml（LCD+LVGL+音频）',
  '生成适合这块板子的sdkconfig.defaults',
]

// Ask AI to extract new knowledge from a completed conversation turn
async function extractKnowledge({ settings, board, userMsg, aiReply, selectedSkillIds }) {
  const extractPrompt = `You just helped a user with ESP32-S3 embedded development.

User asked: ${userMsg}

Your reply contained this code/info: ${aiReply.slice(0, 1200)}

Current skill IDs loaded: ${selectedSkillIds.join(', ') || 'none'}

Task: Does your reply contain a pitfall, a correct usage pattern, or an init sequence that is NOT already documented in the loaded skills?
If YES, respond with ONLY valid JSON (no markdown):
{"found": true, "skillId": "<one of: lvgl|audio|camera|imu|wifi|ble|sdcard|gpio|speech|vision|handheld>", "type": "pitfall|usage", "content": "<one concise sentence>"}
If NO new knowledge, respond with ONLY: {"found": false}`

  let result = ''
  await streamChat({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    messages: [
      { role: 'system', content: 'You are a knowledge extractor. Reply only with the JSON asked, nothing else.' },
      { role: 'user', content: extractPrompt },
    ],
    onChunk: c => { result += c },
    onDone: () => {},
    onError: () => {},
  })
  try {
    return JSON.parse(result.trim())
  } catch {
    return { found: false }
  }
}

// Load persisted skill patches from localStorage
function loadPatches() {
  try { return JSON.parse(localStorage.getItem('skillPatches') || '[]') } catch { return [] }
}
function savePatches(patches) {
  localStorage.setItem('skillPatches', JSON.stringify(patches))
}

export default function ChatPanel({ settings, board, onInsertCode, initialPrompt, onConsumePrompt, selectedSkills = [], onSkillsChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [knowledgeCard, setKnowledgeCard] = useState(null) // {skillId, type, content}
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  // Apply persisted patches on mount
  useEffect(() => {
    loadPatches().forEach(p => patchSkill(p.skillId, p.type, p.content))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt)
      onConsumePrompt?.()
    }
  }, [initialPrompt]) // eslint-disable-line

  const hasConfig = settings.apiKey && settings.baseUrl && settings.model

  function toggleSkill(id) {
    onSkillsChange?.(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming || !hasConfig) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setKnowledgeCard(null)

    const aiMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsg])

    const systemPrompt = board.buildSystemPrompt(selectedSkills)
    const apiMessages = [{ role: 'system', content: systemPrompt }, ...newMessages]

    let aborted = false
    let finalReply = ''
    let streamBuf = ''  // buffer to detect code block boundaries while streaming
    abortRef.current = () => { aborted = true }

    // Languages that should never be auto-written (shell commands, docs, etc.)
    const SKIP_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'powershell', 'text', 'markdown', 'md'])

    // Known config files that live at project root, not under main/
    const ROOT_CONFIG_FILES = new Set([
      'CMakeLists.txt', 'sdkconfig.defaults', 'partitions.csv',
    ])
    const MAIN_CONFIG_FILES = new Set([
      'idf_component.yml',
    ])

    function normalizeFilePath(raw) {
      const normalized = raw.replace(/\\/g, '/')
      const filename = normalized.split('/').pop()
      // Root-level config files
      if (ROOT_CONFIG_FILES.has(filename)) return filename
      // main/ config files
      if (MAIN_CONFIG_FILES.has(filename)) return 'main/' + filename
      // Source files or files already under main/
      const parts = normalized.split('/')
      const mainIdx = parts.lastIndexOf('main')
      if (mainIdx !== -1) return parts.slice(mainIdx).join('/')
      // Fallback: put under main/
      return 'main/' + filename
    }

    function tryFlushCodeBlock(buf) {
      const re = /```(\w*)\n([\s\S]*?)\n```/g
      let m, last = null
      while ((m = re.exec(buf)) !== null) last = m
      if (!last) return buf
      const lang = last[1].toLowerCase()
      const code = last[2].trim()

      if (!SKIP_LANGS.has(lang) && code.length > 0) {
        // FILE: markers take priority — write regardless of language
        const filePattern = /(?:\/\/|#|;)?\s*FILE:\s*(\S+)\n([\s\S]*?)(?=(?:\/\/|#|;)?\s*FILE:|$)/g
        const matches = [...code.matchAll(filePattern)]
        if (matches.length >= 1) {
          const fileMap = {}
          matches.forEach(fm => {
            const p = normalizeFilePath(fm[1])
            fileMap[p] = fm[2].trimEnd()
          })
          onInsertCode?.(fileMap)
        } else if (['c', 'cpp', 'h', 'cc', 'cxx', ''].includes(lang)) {
          // No FILE markers — only write if it's a C/C++ source block
          onInsertCode?.(code)
        }
      }
      return buf.slice(last.index + last[0].length)
    }

    await streamChat({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      messages: apiMessages,
      onChunk: (chunk) => {
        if (aborted) return
        finalReply += chunk
        streamBuf += chunk
        // Try to flush completed code blocks as they arrive
        streamBuf = tryFlushCodeBlock(streamBuf)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      },
      onDone: async () => {
        setStreaming(false)
        // Self-evolution: extract knowledge after reply
        if (!aborted && finalReply.length > 100) {
          const extracted = await extractKnowledge({
            settings, board,
            userMsg: text,
            aiReply: finalReply,
            selectedSkillIds: selectedSkills,
          })
          if (extracted.found) setKnowledgeCard(extracted)
        }
      },
      onError: (err) => {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `**错误**: ${err}`,
            error: true,
          }
          return updated
        })
        setStreaming(false)
      },
    })
  }, [messages, streaming, hasConfig, settings, board, selectedSkills])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleStop() {
    abortRef.current?.()
    setStreaming(false)
  }

  function clearChat() {
    setMessages([])
    setKnowledgeCard(null)
  }

  function acceptKnowledge() {
    if (!knowledgeCard) return
    patchSkill(knowledgeCard.skillId, knowledgeCard.type, knowledgeCard.content)
    const patches = loadPatches()
    patches.push(knowledgeCard)
    savePatches(patches)
    setKnowledgeCard(null)
  }

  function CodeBlock({ children, className }) {
    const lang = className?.replace('language-', '') || 'c'
    const code = String(children).trim()
    return (
      <div className="code-block-wrap">
        <div className="code-block-header">
          <span className="code-lang">{lang}</span>
          <div className="code-actions">
            <button className="code-btn" onClick={() => navigator.clipboard.writeText(code)}>复制</button>
            <button className="code-btn code-btn-insert" onClick={() => {
              // Parse // FILE: path markers into multi-file object
              const filePattern = /\/\/\s*FILE:\s*(\S+)\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g
              const matches = [...code.matchAll(filePattern)]
              if (matches.length > 1) {
                const fileMap = {}
                matches.forEach(m => {
                  const p = m[1].includes('/') ? m[1] : `main/${m[1]}`
                  fileMap[p] = m[2].trimEnd()
                })
                onInsertCode?.(fileMap)
              } else {
                onInsertCode?.(code)
              }
            }}>
              写入项目
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang}
          customStyle={{ margin: 0, borderRadius: '0 0 6px 6px', fontSize: '12px' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <span>AI 代码助手</span>
        </div>
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button className="icon-btn" onClick={clearChat} title="清空对话">🗑</button>
          )}
          <div className={`status-dot ${hasConfig ? 'online' : 'offline'}`} title={hasConfig ? settings.model : '未配置 API'} />
        </div>
      </div>

      {/* Board badge */}
      <div className="board-badge">
        <span className="board-chip">{board.chip}</span>
        <span className="board-name">{board.name}</span>
        <span className="board-idf">IDF {board.idfVersion}</span>
      </div>

      {/* Skill selector */}
      <div className="skill-selector">
        <span className="skill-selector-label">外设模块：</span>
        {board.skills.map(skill => (
          <button
            key={skill.id}
            className={`skill-tag ${selectedSkills.includes(skill.id) ? 'active' : ''}`}
            onClick={() => toggleSkill(skill.id)}
          >
            {skill.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">⚡</div>
            <p>已注入硬件上下文包</p>
            <p className="chat-empty-sub">选择外设模块后，AI 会注入对应详细文档</p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map(q => (
                <button key={q} className="quick-btn" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ inline, className, children }) {
                      if (inline) return <code className="inline-code">{children}</code>
                      return <CodeBlock className={className}>{children}</CodeBlock>
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="cursor-blink">▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Self-evolution knowledge card */}
      {knowledgeCard && (
        <div className="knowledge-card">
          <div className="knowledge-card-header">
            <span>💡 发现新知识</span>
            <span className="knowledge-skill-tag">{knowledgeCard.skillId}</span>
          </div>
          <div className="knowledge-card-body">
            <span className="knowledge-type">{knowledgeCard.type === 'pitfall' ? '⚠ 陷阱' : '✓ 用法'}</span>
            {knowledgeCard.content}
          </div>
          <div className="knowledge-card-actions">
            <button className="knowledge-btn accept" onClick={acceptKnowledge}>写入 Skill</button>
            <button className="knowledge-btn dismiss" onClick={() => setKnowledgeCard(null)}>忽略</button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        {!hasConfig && (
          <div className="no-config-hint">⚠️ 请点击右上角 ⚙ 配置 AI API Key</div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasConfig ? '描述你需要的功能，AI 会结合开发板硬件信息生成代码...' : '请先配置 API Key'}
            disabled={!hasConfig || streaming}
            rows={3}
          />
          <button
            className={`send-btn ${streaming ? 'stop' : ''}`}
            onClick={streaming ? handleStop : () => sendMessage(input)}
            disabled={!hasConfig || (!streaming && !input.trim())}
          >
            {streaming ? '■ 停止' : '发送'}
          </button>
        </div>
        <div className="chat-input-hint">Enter 发送 · Shift+Enter 换行</div>
      </div>
    </div>
  )
}
