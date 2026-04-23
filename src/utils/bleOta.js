/**
 * BLE OTA client — Web Bluetooth API
 *
 * Service UUID:  4FAFC201-1FB5-459E-8FCC-C5C9C331914B
 * CTRL  (write):           start / commit / abort
 * DATA  (write-no-rsp):    firmware chunks
 * STATUS (notify):         progress / success / error
 */

const SVC_UUID    = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
const CTRL_UUID   = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
const DATA_UUID   = '1234abcd-1fb5-459e-8fcc-c5c9c331914b'
const STATUS_UUID = 'abcd1234-1fb5-459e-8fcc-c5c9c331914b'

/* Chunk size: MTU(512) - 3 ATT overhead = 509 bytes */
const CHUNK_SIZE = 509

/**
 * Request a BLE device and return a connected BleOtaSession.
 * Throws if user cancels or BLE not supported.
 */
export async function connectBle() {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth API 不支持。请使用 Chrome / Edge（桌面版）并开启实验性 Web Bluetooth。')
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SVC_UUID] }],
    optionalServices: [SVC_UUID],
  })

  const server  = await device.gatt.connect()
  const service = await server.getPrimaryService(SVC_UUID)

  const [ctrlChar, dataChar, statusChar] = await Promise.all([
    service.getCharacteristic(CTRL_UUID),
    service.getCharacteristic(DATA_UUID),
    service.getCharacteristic(STATUS_UUID),
  ])

  return new BleOtaSession(device, server, ctrlChar, dataChar, statusChar)
}

export class BleOtaSession {
  constructor(device, server, ctrlChar, dataChar, statusChar) {
    this._device     = device
    this._server     = server
    this._ctrl       = ctrlChar
    this._data       = dataChar
    this._status     = statusChar
    this._statusCb   = null

    /* Listen to STATUS notifications */
    this._status.addEventListener('characteristicvaluechanged', (e) => {
      this._onStatus(new Uint8Array(e.target.value.buffer))
    })
    this._status.startNotifications()
  }

  get deviceName() { return this._device.name || 'ESP32-Vibe-OTA' }

  disconnect() {
    try { this._server.disconnect() } catch {}
  }

  /**
   * Flash firmware binary.
   * @param {ArrayBuffer} firmware
   * @param {function} onProgress  ({ sent, total, percent }) => void
   * @returns {Promise<void>} resolves on success, rejects on error
   */
  flash(firmware, onProgress) {
    return new Promise((resolve, reject) => {
      const total = firmware.byteLength
      let sent    = 0

      /* Step 1: send CMD_START [0x01, size(4 bytes big-endian)] */
      const startCmd = new Uint8Array(5)
      startCmd[0] = 0x01
      new DataView(startCmd.buffer).setUint32(1, total, false) /* big-endian */

      this._statusCb = async (bytes) => {
        const code = bytes[0]

        if (code === 0x00) {
          /* READY — start streaming chunks */
          this._statusCb = null
          try {
            await this._streamChunks(firmware, (n) => {
              sent += n
              onProgress?.({ sent, total, percent: Math.round(sent / total * 100) })
            })
          } catch (err) { return reject(err) }

          /* Step 4: send CMD_COMMIT */
          try {
            await this._ctrl.writeValue(new Uint8Array([0x02]))
          } catch (err) { return reject(new Error('commit write failed: ' + err.message)) }

          /* Wait for success/error via statusCb */
          this._statusCb = (bytes2) => {
            if (bytes2[0] === 0x02) {
              this._statusCb = null
              resolve()
            } else if (bytes2[0] === 0x03) {
              this._statusCb = null
              const msg = new TextDecoder().decode(bytes2.slice(1))
              reject(new Error('设备错误: ' + msg))
            }
          }

        } else if (code === 0x01) {
          /* PROGRESS — update sent bytes from device-side counter */
          const view = new DataView(bytes.buffer, bytes.byteOffset)
          const rcvd = view.getUint32(1, false)
          onProgress?.({ sent: rcvd, total, percent: Math.round(rcvd / total * 100) })

        } else if (code === 0x03) {
          this._statusCb = null
          const msg = new TextDecoder().decode(bytes.slice(1))
          reject(new Error('设备错误: ' + msg))
        }
      }

      this._ctrl.writeValue(startCmd).catch((err) => {
        this._statusCb = null
        reject(new Error('start write failed: ' + err.message))
      })
    })
  }

  abort() {
    this._statusCb = null
    return this._ctrl.writeValue(new Uint8Array([0x03])).catch(() => {})
  }

  /* ── private ── */

  _onStatus(bytes) {
    if (this._statusCb) this._statusCb(bytes)
  }

  async _streamChunks(firmware, onChunkSent) {
    const buf   = new Uint8Array(firmware)
    let   offset = 0
    while (offset < buf.length) {
      const end   = Math.min(offset + CHUNK_SIZE, buf.length)
      const chunk = buf.slice(offset, end)
      await this._data.writeValueWithoutResponse(chunk)
      onChunkSent(chunk.byteLength)
      offset = end
      /* Tiny yield to keep UI responsive — BLE flow-control is handled by the stack */
      await new Promise(r => setTimeout(r, 0))
    }
  }
}
