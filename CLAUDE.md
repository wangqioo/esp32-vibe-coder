# ESP32 Vibe Coder — Claude Context

## Project Overview

Web-based AI-assisted code editor for the **立创实战派ESP32-S3** development board.
Users bring their own AI API key, describe what they want in Chinese, and get ESP-IDF v5.4 C code generated with full hardware context injected automatically.

## Target Hardware

**Board:** 立创实战派ESP32-S3 (SZPI)
**Module:** ESP32-S3-WROOM-1-N16R8 (16MB Flash, 8MB Octal PSRAM, dual-core LX7 @ 240MHz)
**Framework:** ESP-IDF v5.4
**BSP:** `esp32_s3_szp.h` / `esp32_s3_szp.c`

Key hardware facts baked into the AI system prompt (see `src/context/base.js`):
- I2C bus: GPIO1 (SDA) / GPIO2 (SCL), shared by 5+ devices
- PCA9557 IO expander @ 0x19: BIT0=LCD_CS, BIT1=PA_EN, BIT2=DVP_PWDN
- ES7210 ADC @ **0x41** (not default 0x40), I2S TDM mode
- ES8311 DAC @ 0x18, I2S STD mode
- QMI8658 IMU @ **0x6A** (not 0x6B)
- LVGL: all calls need `lvgl_port_lock` / `lvgl_port_unlock`
- Speech recognition: I2S fixed 32000Hz/32bit, MP3 must be pre-converted

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Markdown | `react-markdown` + `react-syntax-highlighter` |
| AI Streaming | Fetch SSE — OpenAI-compatible + Anthropic native |
| Styling | CSS Variables, dark theme |
| Build | Vite → nginx:alpine (Docker multi-stage) |
| Compiler | Flask + gunicorn + ESP-IDF v5.4 (separate Docker container) |

## Project Structure

```
esp32-vibe-coder/
├── src/
│   ├── App.jsx                  # Root layout, handleInsertCode, projectFiles state
│   ├── context/
│   │   ├── base.js              # Board identity, pin map, AI output format rules
│   │   ├── index.js             # buildSystemPrompt(), buildProjectFiles(), patchSkill()
│   │   └── skills/              # Per-peripheral skill prompts + config generators
│   ├── utils/
│   │   ├── aiApi.js             # streamChat() + PROVIDER_PRESETS
│   │   ├── compiler.js          # SSE-based compile client → /compile
│   │   ├── storage.js           # Centralized localStorage (namespace: esp32vc:)
│   │   ├── ota.js               # WiFi OTA push (re-exports loadOtaIp/saveOtaIp)
│   │   ├── bleOta.js            # BLE OTA flash
│   │   └── logStream.js         # WebSocket + Serial log stream
│   └── components/
│       ├── ChatPanel.jsx        # Streaming chat + tryFlushCodeBlock()
│       ├── ProjectEditor.jsx    # Monaco editor, source tabs, config file section
│       ├── CompilePanel.jsx     # Compile + WiFi OTA + BLE OTA
│       └── LogPanel.jsx         # Real-time device log viewer
├── compiler-service/
│   └── server.py                # Flask compile server (runs inside esp32-compiler container)
├── Dockerfile                   # Node 20 build → nginx:alpine, port 4100
├── docker-compose.yml           # network_mode: host
└── nginx.conf                   # SPA routing + proxy /compile → 127.0.0.1:8760
```

## Key Architecture Decisions

### File Insertion Flow (AI → Editor)
1. AI streams text with `FILE: path` labels above code blocks
2. `tryFlushCodeBlock()` in `ChatPanel.jsx` processes **all** complete blocks in the buffer — not just the last one (critical: multiple files can arrive in a single SSE chunk)
3. `normalizeFilePath()` canonicalizes paths: `sdkconfig.defaults` → root, `idf_component.yml` → `main/`
4. `handleInsertCode()` in `App.jsx` stores all files in `projectFiles` state — no filtering
5. `ProjectEditor` splits files: source files → top tabs, config files → collapsible "配置文件" section

### Source vs Config Files
- **Source files** (`.c/.cpp/.h/.s`): stored in `projectFiles`, shown as editor tabs, passed to compiler
- **Config files** (`CMakeLists.txt`, `sdkconfig.defaults`, `idf_component.yml`, `partitions.csv`): stored in `projectFiles`, shown in "配置文件" section, **NOT** passed to compiler
- Compiler auto-generates its own CMakeLists/sdkconfig from selected skills + source file list

### Compilation Flow
1. `CompilePanel.handleCompile()` builds `extraFiles`:
   - `skillFiles` = `buildProjectFiles()` from selected skills
   - `mainCmake` = dynamically generated `main/CMakeLists.txt` listing all `.c/.cpp` in `projectFiles`
   - `userSrcs` = only `.c/.cpp/.h` files from `projectFiles` (config files excluded)
2. POST to `/compile` (nginx proxies to compiler container on port 8760)
3. Compiler returns SSE stream: `data: {"log": "..."}` → final `data: {"done": true, "bin": "<base64>"}`
4. `compiler.js` decodes base64 → Blob for download or OTA push

### localStorage (namespace `esp32vc:`)
| Key | Content |
|---|---|
| `esp32vc:settings` | `{ apiKey, baseUrl, model }` |
| `esp32vc:ota-ip` | Last OTA device IP |
| `esp32vc:skill-patches` | Self-evolution knowledge patches |
| `esp32vc:selected-skills` | Active peripheral skill IDs |

## Development

```bash
# NODE_ENV=production skips devDependencies — always use --include=dev
npm install --include=dev
npm run dev       # Vite dev server on :5173
npm run build     # Output to dist/
```

## Docker Architecture (Production)

Two containers, both `network_mode: host`:
- `esp32-vibe-coder` — nginx on port 4100, serves frontend
- `esp32-compiler` — Flask/gunicorn on port 8760, runs ESP-IDF builds

nginx proxies `/compile` and `/health` → `127.0.0.1:8760`.

## ⚠️ Deployment — CRITICAL LESSON

**The frontend is baked into the Docker image at build time.** nginx inside the container serves from `/usr/share/nginx/html/` which is part of the image filesystem — NOT a host-mounted volume.

### WRONG (has no effect):
```bash
# Copying to host directory does nothing — container doesn't see it
cp dist/* /home/wq/esp32-vibe-coder-new/dist/
docker exec esp32-vibe-coder nginx -s reload  # still serving old files
```

### CORRECT — use docker cp to push files INTO the running container:
```bash
npm run build
docker cp dist/. esp32-vibe-coder:/usr/share/nginx/html/
docker exec esp32-vibe-coder nginx -s reload
```

### Full rebuild (when Dockerfile/nginx.conf changed):
```bash
npm run build
docker build -t esp32-vibe-coder:latest .
docker compose up -d --force-recreate esp32-vibe-coder
```

### Python deploy helper (for remote server via SSH):
```python
import paramiko
ssh = paramiko.SSHClient()
ssh.connect("150.158.146.192", port=6002, username="wq", password="...")
sftp = ssh.open_sftp()
sftp.put("/tmp/dist.tar.gz", "/tmp/dist.tar.gz")
ssh.exec_command(
    "cd /tmp && tar xzf dist.tar.gz && "
    "docker cp dist/. esp32-vibe-coder:/usr/share/nginx/html/ && "
    "docker exec esp32-vibe-coder nginx -s reload"
)
```

## Compiler Container Notes

The `esp32-compiler` container runs ESP-IDF v5.4. If `No CMAKE_C_COMPILER could be found` appears:
- Root cause: git submodules empty in Docker image (gitee mirror issue)
- Fix: `docker cp /host/esp-idf/components/<submodule> esp32-compiler:/opt/esp/idf/components/<submodule>`
- Also set `IDF_SKIP_CHECK_SUBMODULES=1` in compile subprocess env

## Repository

https://github.com/wangqioo/esp32-vibe-coder
