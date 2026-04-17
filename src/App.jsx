import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import ChatPanel from './components/ChatPanel'
import SettingsModal from './components/SettingsModal'
import CompilePanel from './components/CompilePanel'
import { BOARDS, DEFAULT_BOARD_ID } from './context/boards'
import './App.css'

const STORAGE_KEY = 'esp32-vibe-coder-settings'

const DEFAULT_CODE = `// ESP32 Vibe Coder — 立创实战派ESP32-S3
// 在右侧与 AI 对话，生成的代码可以直接插入到这里
// ESP-IDF v5.4

#include <stdio.h>
#include "esp32_s3_szp.h"

void app_main(void)
{
    bsp_i2c_init();   // I2C 初始化
    pca9557_init();   // IO 扩展芯片初始化
    bsp_lvgl_start(); // 初始化液晶屏 LVGL 接口

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

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [showCompile, setShowCompile] = useState(false)
  const [boardId] = useState(DEFAULT_BOARD_ID)
  const board = BOARDS[boardId]

  function handleSaveSettings(s) {
    setSettings(s)
    saveSettings(s)
  }

  const handleInsertCode = useCallback((newCode) => {
    setCode(newCode)
  }, [])

  const hasConfig = settings.apiKey && settings.baseUrl && settings.model

  return (
    <div className="app">
      {/* Header */}
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
              <>
                <span className="model-dot online" />
                <span className="model-name">{settings.model}</span>
              </>
            ) : (
              <>
                <span className="model-dot offline" />
                <span className="model-name muted">未配置 API</span>
              </>
            )}
          </div>
          <button
            className={`settings-btn ${!hasConfig ? 'pulse' : ''}`}
            onClick={() => setShowSettings(true)}
            title="AI 配置"
          >
            ⚙ 配置 AI
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="app-body">
        {/* Left: Code editor */}
        <div className="editor-pane">
          <div className="editor-toolbar">
            <div className="file-tab active">
              <span>main.c</span>
            </div>
            <div className="editor-toolbar-right">
              <button
                className="toolbar-btn"
                onClick={() => navigator.clipboard.writeText(code)}
                title="复制全部代码"
              >
                复制代码
              </button>
              <button
                className="toolbar-btn"
                onClick={() => setCode(DEFAULT_CODE)}
                title="重置为默认代码"
              >
                重置
              </button>
              <button
                className="toolbar-btn toolbar-btn-compile"
                onClick={() => setShowCompile(v => !v)}
                title="编译并下载固件"
              >
                ▶ 编译
              </button>
            </div>
          </div>
          <div className="editor-wrap">
            <Editor
              language="c"
              theme="vs-dark"
              value={code}
              onChange={val => setCode(val || '')}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                tabSize: 4,
                wordWrap: 'off',
                padding: { top: 12, bottom: 12 },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
              }}
            />
          </div>
        </div>

        {/* Right: Chat panel */}
        <div className="chat-pane">
          <ChatPanel
            settings={settings}
            board={board}
            onInsertCode={handleInsertCode}
          />
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Compile panel */}
      {showCompile && (
        <CompilePanel
          code={code}
          onClose={() => setShowCompile(false)}
        />
      )}
    </div>
  )
}
