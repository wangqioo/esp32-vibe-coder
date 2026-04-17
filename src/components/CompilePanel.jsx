import { useState } from 'react'
import { compileFirmware, downloadBin, loadCompilerUrl, saveCompilerUrl } from '../utils/compiler'
import './CompilePanel.css'

const STATES = {
  idle:     { label: '▶ 编译',     cls: '' },
  building: { label: '⏳ 编译中...', cls: 'building' },
  ok:       { label: '✓ 编译成功',  cls: 'ok' },
  error:    { label: '✗ 编译失败',  cls: 'error' },
}

export default function CompilePanel({ code, onClose }) {
  const [compilerUrl, setCompilerUrl] = useState(loadCompilerUrl)
  const [state, setState] = useState('idle')
  const [status, setStatus] = useState('')
  const [errorLog, setErrorLog] = useState('')
  const [firmware, setFirmware] = useState(null)

  async function handleCompile() {
    if (!compilerUrl) return
    saveCompilerUrl(compilerUrl)
    setState('building')
    setErrorLog('')
    setFirmware(null)

    try {
      const blob = await compileFirmware(compilerUrl, code, setStatus)
      setFirmware(blob)
      setStatus(`固件大小: ${(blob.size / 1024).toFixed(1)} KB`)
      setState('ok')
    } catch (e) {
      setErrorLog(e.message)
      setStatus('编译失败，查看错误日志')
      setState('error')
    }
  }

  function handleDownload() {
    if (firmware) downloadBin(firmware)
  }

  const s = STATES[state]

  return (
    <div className="compile-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compile-panel">
        <div className="compile-header">
          <span className="compile-title">⚙ 云端编译</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="compile-body">
          <label className="field-label">编译服务器地址</label>
          <input
            className="field-input"
            value={compilerUrl}
            onChange={e => setCompilerUrl(e.target.value)}
            placeholder="http://192.168.1.100:8766"
          />
          <p className="compile-hint">
            本地或远程运行 <code>compiler-service/</code> Docker 容器，填入其地址。
          </p>

          <div className="compile-actions">
            <button
              className={`compile-btn ${s.cls}`}
              onClick={handleCompile}
              disabled={!compilerUrl || state === 'building'}
            >
              {s.label}
            </button>

            {state === 'ok' && (
              <button className="compile-btn download" onClick={handleDownload}>
                ↓ 下载 firmware.bin
              </button>
            )}
          </div>

          {status && (
            <div className={`compile-status ${state}`}>{status}</div>
          )}

          {errorLog && (
            <pre className="compile-log">{errorLog}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
