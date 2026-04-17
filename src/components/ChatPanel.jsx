import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { streamChat } from '../utils/aiApi'
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

export default function ChatPanel({ settings, board, onInsertCode, initialPrompt, onConsumePrompt }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send when log analysis is triggered from LogPanel
  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt)
      onConsumePrompt?.()
    }
  }, [initialPrompt]) // eslint-disable-line

  const hasConfig = settings.apiKey && settings.baseUrl && settings.model

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming || !hasConfig) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    const aiMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsg])

    const systemMsg = {
      role: 'system',
      content: board.systemPrompt,
    }

    const apiMessages = [systemMsg, ...newMessages]

    let aborted = false
    abortRef.current = () => { aborted = true }

    await streamChat({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      messages: apiMessages,
      onChunk: (chunk) => {
        if (aborted) return
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      },
      onDone: () => setStreaming(false),
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
  }, [messages, streaming, hasConfig, settings, board])

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
  }

  // Custom code block renderer — adds "Insert to Editor" button
  function CodeBlock({ children, className }) {
    const lang = className?.replace('language-', '') || 'c'
    const code = String(children).trim()
    return (
      <div className="code-block-wrap">
        <div className="code-block-header">
          <span className="code-lang">{lang}</span>
          <div className="code-actions">
            <button className="code-btn" onClick={() => navigator.clipboard.writeText(code)}>复制</button>
            <button className="code-btn code-btn-insert" onClick={() => onInsertCode?.(code)}>
              插入编辑器
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
            <button className="icon-btn" onClick={clearChat} title="清空对话">
              🗑
            </button>
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

      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">⚡</div>
            <p>已注入硬件上下文包</p>
            <p className="chat-empty-sub">AI 已了解此开发板的全部引脚和外设配置</p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map(q => (
                <button key={q} className="quick-btn" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
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

      {/* Input area */}
      <div className="chat-input-area">
        {!hasConfig && (
          <div className="no-config-hint">
            ⚠️ 请点击右上角 ⚙ 配置 AI API Key
          </div>
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
