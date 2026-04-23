/**
 * WiFi OTA push client
 * Sends compiled firmware.bin directly to ESP32's HTTP OTA server
 */

const OTA_KEY = 'esp32-vibe-coder-ota-ip'

export function loadOtaIp() {
  return localStorage.getItem(OTA_KEY) || ''
}

export function saveOtaIp(ip) {
  localStorage.setItem(OTA_KEY, ip)
}

/**
 * Ping ESP32 OTA server to check if it's reachable
 * @param {string} ip  e.g. 192.168.1.88
 */
export async function pingDevice(ip) {
  const res = await fetch(`http://${ip}:3232/ping`, {
    signal: AbortSignal.timeout(3000),
  })
  return res.ok
}

/**
 * Get device info (firmware version, IP, RSSI)
 */
export async function getDeviceInfo(ip) {
  const res = await fetch(`http://${ip}:3232/info`, {
    signal: AbortSignal.timeout(3000),
  })
  if (!res.ok) throw new Error('device not responding')
  return res.json()
}

/**
 * Push firmware binary to ESP32 via HTTP OTA
 * @param {string}   ip         device IP
 * @param {Blob}     firmware   binary blob from compiler
 * @param {function} onProgress (percent: number) callback
 */
export async function pushOta(ip, firmware, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('网络错误，请检查设备连接')))
    xhr.addEventListener('timeout', () => reject(new Error('推送超时')))

    xhr.timeout = 60000
    xhr.open('POST', `http://${ip}:3232/ota`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.send(firmware)
  })
}
