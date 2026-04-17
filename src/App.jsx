import { useState, useCallback } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import SettingsModal from './components/SettingsModal'
import CompilePanel from './components/CompilePanel'
import ProjectEditor from './components/ProjectEditor'
import { BOARDS, DEFAULT_BOARD_ID } from './context/boards'
import './App.css'

const STORAGE_KEY = 'esp32-vibe-coder-settings'

const DEFAULT_MAIN = `// ESP32 Vibe Coder — 立创实战派ESP32-S3
// 在右侧与 AI 对话，AI 会直接组织整个项目的文件
// ESP-IDF v5.4

#include <stdio.h>
#include "esp32_s3_szp.h"

void app_main(void)
{
    bsp_i2c_init();
    pca9557_init();
    bsp_lvgl_start();

    // 在这里开始你的应用...
}
`

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { baseUrl: '', apiKey: '', model: '' }
}
function saveSettings(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

export default function App() {
  const [settings, setSettings]       = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [showCompile, setShowCompile]  = useState(false)
  const [rightTab, setRightTab]        = useState('chat')
  const [pendingLogAnalysis, setPendingLogAnalysis] = useState(null)
  const [boardId]                      = useState(DEFAULT_BOARD_ID)
  const [selectedSkills, setSelectedSkills] = useState([])
  const board = BOARDS[boardId]

  // projectFiles contains only source files (.c/.h etc) — config files generated at compile time
  const [projectFiles, setProjectFiles] = useState({ 'main/main.c': DEFAULT_MAIN })
  const [activeFile, setActiveFile] = useState('main/main.c')

  function handleSaveSettings(s) { setSettings(s); saveSettings(s) }

  // Called by AI with a map of { filename: code } or a single code string
  const handleInsertCode = useCallback((codeOrFiles) => {
    if (typeof codeOrFiles === 'string') {
      // Single code block — write to active source file
      const target = activeFile.endsWith('.c') || activeFile.endsWith('.cpp') || activeFile.endsWith('.h')
        ? activeFile
        : 'main/main.c'
      setProjectFiles(prev => ({ ...prev, [target]: codeOrFiles }))
      setActiveFile(target)
    } else {
      // Multi-file object from AI
      setProjectFiles(prev => ({ ...prev, ...codeOrFiles }))
      const first = Object.keys(codeOrFiles)[0]
      if (first) setActiveFile(first)
    }
  }, [activeFile])

  const hasConfig = settings.apiKey && settings.baseUrl && settings.model

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">ESP32 Vibe Coder</span>
          </div>
          <div className="divider" />
          <div className="board-selector">
            <span className="board-selector-chip">{board.chip}</span>
            <span className="board-selector-name">{board.name}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="model-info">
            {hasConfig ? (
              <><span className="model-dot online" /><span className="model-name">{settings.model}</span></>
            ) : (
              <><span className="model-dot offline" /><span className="model-name muted">未配置 API</span></>
            )}
          </div>
          <button className={`settings-btn ${!hasConfig ? 'pulse' : ''}`} onClick={() => setShowSettings(true)}>
            ⚙ 配置 AI
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Left: Project editor */}
        <div className="editor-pane">
          <ProjectEditor
            files={projectFiles}
            activeFile={activeFile}
            onFileChange={(newFiles, newActive) => {
              setProjectFiles(newFiles)
              if (newActive !== undefined) setActiveFile(newActive)
            }}
            onFileSelect={setActiveFile}
            onCompile={() => setShowCompile(true)}
          />
        </div>

        {/* Right: Chat + Log */}
        <div className="right-pane">
          <div className="right-tabs">
            <button className={`right-tab ${rightTab === 'chat' ? 'active' : ''}`} onClick={() => setRightTab('chat')}>
              🤖 AI 助手
            </button>
            <button className={`right-tab ${rightTab === 'log' ? 'active' : ''}`} onClick={() => setRightTab('log')}>
              📟 设备日志
            </button>
          </div>
          <div className="right-tab-content">
            {rightTab === 'chat' ? (
              <ChatPanel
                settings={settings}
                board={board}
                onInsertCode={handleInsertCode}
                initialPrompt={pendingLogAnalysis}
                onConsumePrompt={() => setPendingLogAnalysis(null)}
                selectedSkills={selectedSkills}
                onSkillsChange={setSelectedSkills}
              />
            ) : (
              <LogPanel
                onAnalyze={(logs) => {
                  setPendingLogAnalysis(
                    `请帮我分析以下 ESP32 设备日志，找出问题原因并给出修复建议：\n\n\`\`\`\n${logs}\n\`\`\``
                  )
                  setRightTab('chat')
                }}
              />
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}

      {showCompile && (
        <CompilePanel
          projectFiles={projectFiles}
          selectedSkills={selectedSkills}
          onClose={() => setShowCompile(false)}
        />
      )}
    </div>
  )
}
