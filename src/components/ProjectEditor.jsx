import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import './ProjectEditor.css'

const LANG_MAP = {
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  js: 'javascript', json: 'json',
  cmake: 'cmake', txt: 'plaintext',
  yml: 'yaml', yaml: 'yaml',
  defaults: 'plaintext', csv: 'plaintext',
  py: 'python',
}

function langFor(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return LANG_MAP[ext] || 'plaintext'
}

// Auto-generated config files (from skills) — shown read-only styled, but still editable
const CONFIG_FILES = new Set([
  'CMakeLists.txt', 'main/CMakeLists.txt',
  'sdkconfig.defaults', 'main/idf_component.yml', 'partitions.csv',
])

export default function ProjectEditor({ files, activeFile, onFileChange, onFileSelect, onAddFile, onCompile }) {
  const [renaming, setRenaming] = useState(null)
  const [newName, setNewName] = useState('')

  const userFiles = Object.keys(files).filter(f => !f.startsWith('__'))
  const mainFile = userFiles.find(f => f === 'main/main.c' || f === 'main/main.cpp') || userFiles[0]

  function handleTabClick(path) {
    onFileSelect(path)
  }

  function handleClose(e, path) {
    e.stopPropagation()
    // Don't allow closing main file or config files
    if (path === mainFile || CONFIG_FILES.has(path)) return
    const remaining = { ...files }
    delete remaining[path]
    onFileChange(remaining, mainFile)
  }

  function handleAddFile() {
    const name = prompt('新文件名 (例: helper.c 或 main/helper.c)')
    if (!name) return
    const path = name.includes('/') ? name : `main/${name}`
    onFileChange({ ...files, [path]: `// ${path}\n` }, path)
  }

  const isConfig = CONFIG_FILES.has(activeFile)

  return (
    <div className="project-editor">
      {/* Tab bar */}
      <div className="pe-tabs">
        <div className="pe-tabs-scroll">
          {userFiles.map(path => {
            const name = path.split('/').pop()
            const isMain = path === mainFile
            const isCfg = CONFIG_FILES.has(path)
            return (
              <div
                key={path}
                className={`pe-tab ${activeFile === path ? 'active' : ''} ${isCfg ? 'config' : ''}`}
                onClick={() => handleTabClick(path)}
                title={path}
              >
                <span className="pe-tab-name">{name}</span>
                {!isMain && !isCfg && (
                  <span className="pe-tab-close" onClick={e => handleClose(e, path)}>×</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="pe-tabs-actions">
          <button className="pe-add-btn" onClick={handleAddFile} title="新建文件">+</button>
          <button className="pe-compile-btn" onClick={onCompile}>▶ 编译</button>
        </div>
      </div>

      {/* Config file notice */}
      {isConfig && (
        <div className="pe-config-notice">
          ⚙ 由 Skills 自动生成 · 可手动覆盖
        </div>
      )}

      {/* Editor */}
      <div className="pe-editor-wrap">
        {activeFile && files[activeFile] !== undefined ? (
          <Editor
            key={activeFile}
            language={langFor(activeFile)}
            theme="vs-dark"
            value={files[activeFile]}
            onChange={val => onFileChange({ ...files, [activeFile]: val || '' }, activeFile)}
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
        ) : (
          <div className="pe-empty">选择或新建文件</div>
        )}
      </div>
    </div>
  )
}
