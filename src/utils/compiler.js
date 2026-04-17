/**
 * Cloud compiler client
 * Sends code + projectFiles to the compiler service, returns firmware blob
 */

const COMPILER_KEY = 'esp32-vibe-coder-compiler-url'

export function loadCompilerUrl() {
  return localStorage.getItem(COMPILER_KEY) || (typeof window !== 'undefined' ? window.location.origin : '')
}

export function saveCompilerUrl(url) {
  localStorage.setItem(COMPILER_KEY, url)
}

/**
 * @param {string}   compilerUrl   e.g. http://192.168.1.100:8766
 * @param {string}   code          C source code (main.c content)
 * @param {object}   projectFiles  from buildProjectFiles() — config files map
 * @param {function} onStatus      status string callback
 * @returns {Promise<Blob>}        firmware binary blob
 */
export async function compileFirmware(compilerUrl, code, projectFiles, onStatus) {
  const base = (compilerUrl || window.location.origin).replace(/\/$/, '')
  onStatus('正在连接编译服务器...')

  const res = await fetch(`${base}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, projectFiles }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '未知错误' }))
    throw new Error(err.output || err.error || `HTTP ${res.status}`)
  }

  onStatus('编译成功，正在下载固件...')
  return res.blob()
}

export function downloadBin(blob, filename = 'firmware.bin') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
