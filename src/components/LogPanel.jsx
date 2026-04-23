import { useState, useRef, useEffect, useCallback } from 'react'
import {
  createWsLogStream, createSerialLogStream,
  parseLine, LEVEL_COLOR,
} from '../utils/logStream'
import { loadOtaIp } from '../utils/ota'
import './LogPanel.css'

const MAX_LINES = 1000

export default function LogPanel({ onAnalyze }) {
  const [lines,      setLines]      = useState([])
  const [filter,     setFilter]     = useState('')    // level filter E/W/I/D/V/all
  const [search,     setSearch]     = useState('')
  const [source,     setSource]     = useState('wifi') // 'wifi' | 'serial'
  const [wifiIp,     setWifiIp]     = useState(loadOtaIp)
  const [connStatus, setConnStatus] = useState('idle') // idle|connecting|connected|disconnected|error
  const [autoScroll, setAutoScroll] = useState(true)

  const streamRef  = useRef(null)
  const bottomRef  = useRef(null)
  const listRef    = useRef(null)

  /* Auto-scroll */
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, autoScroll])

  /* Detect manual scroll up → disable auto-scroll */
  function handleScroll() {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }

  const addLine = useCallback((raw, src) => {
    const parsed = parseLine(raw.trimEnd())
    setLines(prev => {
      const next = [...prev, { ...parsed, src, id: Date.now() + Math.random() }]
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
    })
  }, [])

  function updateStatus(s) { setConnStatus(s) }

  async function connect() {
    streamRef.current?.stop()
    setLines([])
    setConnStatus('connecting')

    try {
      if (source === 'wifi') {
        streamRef.current = createWsLogStream(wifiIp, addLine, updateStatus)
      } else {
        streamRef.current = await createSerialLogStream(addLine, updateStatus)
      }
    } catch (e) {
      setConnStatus('error')
      addLine(`[错误] ${e.message}`, source)
    }
  }

  function disconnect() {
    streamRef.current?.stop()
    streamRef.current = null
    setConnStatus('idle')
  }

  /* Cleanup on unmount */
  useEffect(() => () => streamRef.current?.stop(), [])

  /* Filtered lines */
  const visible = lines.filter(l => {
    if (filter && filter !== 'all' && l.level !== filter) return false
    if (search && !l.raw.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusDot = {
    idle:         'offline',
    connecting:   'connecting',
    connected:    'online',
    disconnected: 'offline',
    error:        'error',
  }[connStatus]

  const counts = { E: 0, W: 0 }
  lines.forEach(l => { if (l.level === 'E') counts.E++; if (l.level === 'W') counts.W++ })

  return (
    <div className="log-panel">
      {/* Header */}
      <div className="log-header">
        <div className="log-title">
          <span className="log-icon">📟</span>
          <span>设备日志</span>
          {counts.E > 0 && <span className="badge error">{counts.E} ERR</span>}
          {counts.W > 0 && <span className="badge warn">{counts.W} WARN</span>}
        </div>
        <div className="log-header-right">
          <button className="icon-btn" onClick={() => setLines([])} title="清空日志">🗑</button>
          {onAnalyze && lines.length > 0 && (
            <button className="icon-btn analyze-btn"
              onClick={() => onAnalyze(lines.map(l => l.raw).join('\n'))}
              title="AI 分析日志">
              ✨
            </button>
          )}
        </div>
      </div>

      {/* Connection bar */}
      <div className="log-conn-bar">
        <div className="source-tabs">
          <button className={`src-tab ${source === 'wifi' ? 'active' : ''}`}
            onClick={() => setSource('wifi')}>WiFi</button>
          <button className={`src-tab ${source === 'serial' ? 'active' : ''}`}
            onClick={() => setSource('serial')}>USB 串口</button>
        </div>

        {source === 'wifi' && (
          <input className="log-ip-input" value={wifiIp}
            onChange={e => setWifiIp(e.target.value)}
            placeholder="192.168.1.88" />
        )}

        <div className={`conn-dot ${statusDot}`} title={connStatus} />

        {connStatus === 'connected' ? (
          <button className="log-conn-btn stop" onClick={disconnect}>断开</button>
        ) : (
          <button className="log-conn-btn"
            onClick={connect}
            disabled={source === 'wifi' && !wifiIp}>
            连接
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="log-filter-bar">
        {['all', 'E', 'W', 'I', 'D', 'V'].map(lv => (
          <button key={lv}
            className={`level-btn lv-${lv} ${filter === lv || (lv === 'all' && !filter) ? 'active' : ''}`}
            onClick={() => setFilter(lv === 'all' ? '' : lv)}>
            {lv === 'all' ? 'ALL' : lv}
          </button>
        ))}
        <input className="log-search" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索..." />
      </div>

      {/* Log lines */}
      <div className="log-lines" ref={listRef} onScroll={handleScroll}>
        {visible.length === 0 && connStatus !== 'connected' && (
          <div className="log-empty">
            <div>📡</div>
            <p>连接设备后开始接收日志</p>
            <p className="log-empty-sub">支持 WiFi WebSocket 和 USB 串口</p>
          </div>
        )}
        {visible.map(l => (
          <div key={l.id} className={`log-line lv-${l.level}`}>
            <span className="log-badge lv-bg-${l.level}">{l.level}</span>
            {l.ms !== null && (
              <span className="log-ms">{(l.ms / 1000).toFixed(3)}s</span>
            )}
            {l.tag && <span className="log-tag">{l.tag}</span>}
            <span className="log-text" style={{ color: LEVEL_COLOR[l.level] }}>
              {l.text ?? l.raw}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <button className="scroll-to-bottom" onClick={() => {
          setAutoScroll(true)
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }}>
          ↓ 滚动到底部
        </button>
      )}
    </div>
  )
}
