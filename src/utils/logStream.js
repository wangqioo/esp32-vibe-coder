/**
 * Log stream manager
 * Supports two backends:
 *   - WiFi WebSocket  → ws://<ip>:3232/log
 *   - WebSerial       → USB serial port (115200 baud)
 */

/* ── WiFi WebSocket ────────────────────────────────────────── */
export function createWsLogStream(ip, onLine, onStatus) {
  let ws = null
  let stopped = false

  function connect() {
    onStatus('connecting')
    ws = new WebSocket(`ws://${ip}:3232/log`)

    ws.onopen  = () => onStatus('connected')
    ws.onclose = () => {
      onStatus('disconnected')
      if (!stopped) setTimeout(connect, 3000) // auto-reconnect
    }
    ws.onerror = () => onStatus('error')
    ws.onmessage = (e) => onLine(e.data, 'wifi')
  }

  connect()

  return {
    stop() {
      stopped = true
      ws?.close()
    },
  }
}

/* ── WebSerial ─────────────────────────────────────────────── */
export async function createSerialLogStream(onLine, onStatus) {
  if (!('serial' in navigator)) {
    throw new Error('浏览器不支持 WebSerial（请用 Chrome/Edge）')
  }

  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 115200 })
  onStatus('connected')

  const decoder = new TextDecoderStream()
  const reader  = decoder.readable.getReader()
  port.readable.pipeTo(decoder.writable)

  let buffer = ''

  // Read loop in background
  ;(async () => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop()           // keep incomplete line
        for (const line of lines) {
          if (line.trim()) onLine(line, 'serial')
        }
      }
    } catch {
      /* port closed */
    } finally {
      onStatus('disconnected')
    }
  })()

  return {
    async stop() {
      reader.cancel()
      await port.close()
    },
  }
}

/* ── Log line parser ───────────────────────────────────────── */
// ESP-IDF log format: I (1234) tag: message
const LOG_RE = /^([IWEDV])\s+\((\d+)\)\s+([\w\-]+):\s+(.*)$/

export function parseLine(raw) {
  const m = raw.match(LOG_RE)
  if (!m) return { level: 'raw', ms: null, tag: null, text: raw }
  return {
    level: m[1],   // I W E D V
    ms:    parseInt(m[2]),
    tag:   m[3],
    text:  m[4],
    raw,
  }
}

export const LEVEL_COLOR = {
  E: 'var(--red)',
  W: 'var(--orange)',
  I: 'var(--text-primary)',
  D: 'var(--text-secondary)',
  V: 'var(--text-muted)',
  raw: 'var(--text-muted)',
}
