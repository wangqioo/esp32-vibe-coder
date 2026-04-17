import { useState, useEffect, useRef } from 'react'
import { compileFirmware, downloadBin, loadCompilerUrl, saveCompilerUrl } from '../utils/compiler'
import { getDeviceInfo, pushOta, loadOtaIp, saveOtaIp } from '../utils/ota'
import { connectBle } from '../utils/bleOta'
import './CompilePanel.css'

const BUILD = {
  idle:     { label: '▶ 编译',      cls: '' },
  building: { label: '⏳ 编译中...', cls: 'building' },
  ok:       { label: '✓ 编译成功',  cls: 'ok' },
  error:    { label: '✗ 编译失败',  cls: 'error' },
}
const OTA = {
  idle:    { label: '↑ 推送 OTA', cls: '' },
  pushing: { label: '↑ 推送中...', cls: 'building' },
  ok:      { label: '✓ 烧录成功',  cls: 'ok' },
  error:   { label: '✗ 推送失败',  cls: 'error' },
}
const BLE = {
  idle:       { label: '⬡ BLE 烧录',  cls: '' },
  connecting: { label: '⬡ 配对中...', cls: 'building' },
  flashing:   { label: '⬡ 烧录中...', cls: 'building' },
  ok:         { label: '✓ BLE 成功',  cls: 'ok' },
  error:      { label: '✗ BLE 失败',  cls: 'error' },
}

export default function CompilePanel({ projectFiles: projectFilesProp, onClose }) {
  const [compilerUrl, setCompilerUrl] = useState(loadCompilerUrl)
  const [buildState,  setBuildState]  = useState('idle')
  const [otaState,    setOtaState]    = useState('idle')
  const [status,      setStatus]      = useState('')
  const [errorLog,    setErrorLog]    = useState('')
  const [firmware,    setFirmware]    = useState(null)
  const [otaIp,       setOtaIp]       = useState(loadOtaIp)
  const [deviceInfo,  setDeviceInfo]  = useState(null)
  const [otaProgress, setOtaProgress] = useState(0)
  const [bleState,    setBleState]    = useState('idle')
  const [bleProgress, setBleProgress] = useState(0)
  const [bleName,     setBleName]     = useState('')
  const [showFiles,   setShowFiles]   = useState(false)
  const bleSessionRef = useRef(null)

  const projectFiles = projectFilesProp || {}

  useEffect(() => {
    if (!otaIp) return
    let cancelled = false
    getDeviceInfo(otaIp)
      .then(info => { if (!cancelled) setDeviceInfo(info) })
      .catch(() => { if (!cancelled) setDeviceInfo(null) })
    return () => { cancelled = true }
  }, [otaIp])

  async function handleCompile() {
    if (!compilerUrl) return
    saveCompilerUrl(compilerUrl)
    setBuildState('building')
    setOtaState('idle')
    setErrorLog('')
    setFirmware(null)
    setStatus('正在连接编译服务器...')
    // Extract main source from projectFiles
    const mainPath = Object.keys(projectFiles).find(k => k.endsWith('main.c') || k.endsWith('main.cpp')) || 'main/main.c'
    const code = projectFiles[mainPath] || ''
    // Send all non-__ files except the main file (server writes it separately)
    const configFiles = Object.fromEntries(Object.entries(projectFiles).filter(([k]) => !k.startsWith('__') && k !== mainPath))
    try {
      const blob = await compileFirmware(compilerUrl, code, configFiles, setStatus)
      setFirmware(blob)
      setStatus(`编译成功  ·  ${(blob.size / 1024).toFixed(1)} KB`)
      setBuildState('ok')
    } catch (e) {
      setErrorLog(e.message)
      setStatus('编译失败，查看错误日志')
      setBuildState('error')
    }
  }

  async function handleOta() {
    if (!firmware || !otaIp) return
    saveOtaIp(otaIp)
    setOtaState('pushing')
    setOtaProgress(0)
    setStatus('正在推送固件...')
    try {
      await pushOta(otaIp, firmware, pct => {
        setOtaProgress(pct)
        setStatus(`推送中... ${pct}%`)
      })
      setStatus('固件推送成功！设备正在重启...')
      setOtaState('ok')
      setDeviceInfo(null)
    } catch (e) {
      setErrorLog(e.message)
      setStatus('OTA 推送失败')
      setOtaState('error')
    }
  }

  async function handleBleFlash() {
    if (!firmware) return
    setBleState('connecting')
    setBleProgress(0)
    setStatus('请在弹窗中选择 ESP32-Vibe-OTA 设备...')
    let session
    try {
      session = await connectBle()
      bleSessionRef.current = session
      setBleName(session.deviceName)
      setBleState('flashing')
      setStatus(`BLE 已连接: ${session.deviceName}，开始烧录...`)
    } catch (e) {
      setBleState('error')
      setStatus('BLE 连接失败: ' + e.message)
      return
    }
    try {
      const buf = await firmware.arrayBuffer()
      await session.flash(buf, ({ sent, total, percent }) => {
        setBleProgress(percent)
        setStatus(`BLE 烧录中... ${percent}%  (${(sent/1024).toFixed(0)} / ${(total/1024).toFixed(0)} KB)`)
      })
      setStatus('BLE 烧录成功！设备正在重启...')
      setBleState('ok')
    } catch (e) {
      setErrorLog(e.message)
      setStatus('BLE 烧录失败')
      setBleState('error')
    } finally {
      session.disconnect()
      bleSessionRef.current = null
    }
  }

  const b  = BUILD[buildState]
  const o  = OTA[otaState]
  const bl = BLE[bleState]

  return (
    <div className="compile-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compile-panel">
        <div className="compile-header">
          <span className="compile-title">⚙ 编译 & 烧录</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="compile-body">
          {/* 工程文件预览 */}
          <div className="project-files-row">
            <span className="field-label" style={{margin:0}}>工程配置</span>
            <button className="files-toggle" onClick={() => setShowFiles(v => !v)}>
              {showFiles ? '收起' : `查看 ${Object.keys(projectFiles).length} 个文件`}
            </button>
          </div>
          {showFiles && (
            <div className="project-files-preview">
              {Object.entries(projectFiles).map(([name, content]) => (
                <details key={name}>
                  <summary>{name}</summary>
                  <pre>{content}</pre>
                </details>
              ))}
            </div>
          )}

          {/* 编译服务器 */}
          <label className="field-label">编译服务器地址</label>
          <input
            className="field-input"
            value={compilerUrl}
            onChange={e => setCompilerUrl(e.target.value)}
            placeholder="http://192.168.1.100:8766"
          />
          <p className="compile-hint">运行 <code>compiler-service/</code> Docker 容器后填入地址</p>

          <button
            className={`compile-btn ${b.cls}`}
            onClick={handleCompile}
            disabled={!compilerUrl || buildState === 'building'}
          >
            {b.label}
          </button>

          {/* WiFi OTA */}
          <div className="ota-section">
            <label className="field-label">设备 IP（WiFi OTA）</label>
            <div className="ota-ip-row">
              <input
                className="field-input"
                value={otaIp}
                onChange={e => { setOtaIp(e.target.value); setDeviceInfo(null) }}
                placeholder="192.168.1.88"
              />
              <div className={`device-dot ${deviceInfo ? 'online' : 'offline'}`}
                   title={deviceInfo ? `${deviceInfo.version}  RSSI: ${deviceInfo.rssi} dBm` : '未检测到设备'} />
            </div>
            {deviceInfo && (
              <div className="device-info">
                当前固件: <b>{deviceInfo.version}</b> · RSSI: {deviceInfo.rssi} dBm
              </div>
            )}
            {otaState === 'pushing' && (
              <div className="ota-progress-wrap">
                <div className="ota-progress-bar" style={{ width: `${otaProgress}%` }} />
                <span>{otaProgress}%</span>
              </div>
            )}
            <div className="compile-actions">
              <button className={`compile-btn ${o.cls}`} onClick={handleOta}
                disabled={!firmware || !otaIp || otaState === 'pushing'}>
                {o.label}
              </button>
              {buildState === 'ok' && (
                <button className="compile-btn download" onClick={() => downloadBin(firmware)}>
                  ↓ 下载 .bin
                </button>
              )}
            </div>
          </div>

          {/* BLE OTA */}
          <div className="ota-section ble-section">
            <label className="field-label">BLE 烧录（无需 WiFi）</label>
            <p className="compile-hint">
              通过蓝牙直接烧录。需要 Chrome / Edge 桌面版，设备需运行 OTA 固件。
            </p>
            {bleState === 'flashing' && (
              <div className="ota-progress-wrap">
                <div className="ota-progress-bar ble-bar" style={{ width: `${bleProgress}%` }} />
                <span>{bleProgress}%</span>
              </div>
            )}
            {bleName && bleState !== 'idle' && bleState !== 'connecting' && (
              <div className="device-info">已连接: <b>{bleName}</b></div>
            )}
            <button className={`compile-btn ble-btn ${bl.cls}`} onClick={handleBleFlash}
              disabled={!firmware || bleState === 'connecting' || bleState === 'flashing'}>
              {bl.label}
            </button>
          </div>

          {/* 状态 & 日志 */}
          {status && (
            <div className={`compile-status ${otaState === 'ok' ? 'ok' : buildState}`}>
              {status}
            </div>
          )}
          {errorLog && <pre className="compile-log">{errorLog}</pre>}
        </div>
      </div>
    </div>
  )
}
