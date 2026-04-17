import { useState, useEffect } from 'react'
import { compileFirmware, downloadBin, loadCompilerUrl, saveCompilerUrl } from '../utils/compiler'
import { pingDevice, getDeviceInfo, pushOta, loadOtaIp, saveOtaIp } from '../utils/ota'
import './CompilePanel.css'

const BUILD = {
  idle:     { label: '▶ 编译',      cls: '' },
  building: { label: '⏳ 编译中...', cls: 'building' },
  ok:       { label: '✓ 编译成功',  cls: 'ok' },
  error:    { label: '✗ 编译失败',  cls: 'error' },
}

const OTA = {
  idle:     { label: '↑ 推送 OTA',  cls: '' },
  pushing:  { label: '↑ 推送中...',  cls: 'building' },
  ok:       { label: '✓ 烧录成功',  cls: 'ok' },
  error:    { label: '✗ 推送失败',  cls: 'error' },
}

export default function CompilePanel({ code, onClose }) {
  const [compilerUrl, setCompilerUrl] = useState(loadCompilerUrl)
  const [buildState, setBuildState]   = useState('idle')
  const [otaState,   setOtaState]     = useState('idle')
  const [status,     setStatus]       = useState('')
  const [errorLog,   setErrorLog]     = useState('')
  const [firmware,   setFirmware]     = useState(null)
  const [otaIp,      setOtaIp]        = useState(loadOtaIp)
  const [deviceInfo, setDeviceInfo]   = useState(null)
  const [otaProgress, setOtaProgress] = useState(0)

  /* 设备探测 */
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

    try {
      const blob = await compileFirmware(compilerUrl, code, setStatus)
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
      await pushOta(otaIp, firmware, (pct) => {
        setOtaProgress(pct)
        setStatus(`推送中... ${pct}%`)
      })
      setStatus('固件推送成功！设备正在重启...')
      setOtaState('ok')
      setDeviceInfo(null) // 设备重启后失联
    } catch (e) {
      setErrorLog(e.message)
      setStatus('OTA 推送失败')
      setOtaState('error')
    }
  }

  const b = BUILD[buildState]
  const o = OTA[otaState]

  return (
    <div className="compile-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compile-panel">
        <div className="compile-header">
          <span className="compile-title">⚙ 编译 & 烧录</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="compile-body">
          {/* ── 编译服务器 ── */}
          <label className="field-label">编译服务器地址</label>
          <input
            className="field-input"
            value={compilerUrl}
            onChange={e => setCompilerUrl(e.target.value)}
            placeholder="http://192.168.1.100:8766"
          />
          <p className="compile-hint">
            运行 <code>compiler-service/</code> Docker 容器后填入地址
          </p>

          <button
            className={`compile-btn ${b.cls}`}
            onClick={handleCompile}
            disabled={!compilerUrl || buildState === 'building'}
          >
            {b.label}
          </button>

          {/* ── OTA 推送 ── */}
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
                   title={deviceInfo
                     ? `${deviceInfo.version}  RSSI: ${deviceInfo.rssi} dBm`
                     : '未检测到设备'} />
            </div>

            {deviceInfo && (
              <div className="device-info">
                当前固件: <b>{deviceInfo.version}</b>
                &nbsp;·&nbsp; RSSI: {deviceInfo.rssi} dBm
              </div>
            )}

            {otaState === 'pushing' && (
              <div className="ota-progress-wrap">
                <div className="ota-progress-bar" style={{ width: `${otaProgress}%` }} />
                <span>{otaProgress}%</span>
              </div>
            )}

            <div className="compile-actions">
              <button
                className={`compile-btn ${o.cls}`}
                onClick={handleOta}
                disabled={!firmware || !otaIp || otaState === 'pushing'}
                title={!firmware ? '请先编译' : ''}
              >
                {o.label}
              </button>

              {buildState === 'ok' && (
                <button className="compile-btn download" onClick={() => downloadBin(firmware)}>
                  ↓ 下载 .bin
                </button>
              )}
            </div>
          </div>

          {/* ── 状态 & 日志 ── */}
          {status && (
            <div className={`compile-status ${otaState === 'ok' ? 'ok' : buildState}`}>
              {status}
            </div>
          )}

          {errorLog && (
            <pre className="compile-log">{errorLog}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
