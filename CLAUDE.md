# ESP32 Vibe Coder — Claude Context

## Project Overview

Web-based AI-assisted code editor for the **立创实战派ESP32-S3** development board.
Users bring their own AI API key, describe what they want in Chinese, and get ESP-IDF v5.4 C code generated with full hardware context injected automatically.

## Target Hardware

**Board:** 立创实战派ESP32-S3 (SZPI)
**Module:** ESP32-S3-WROOM-1-N16R8 (16MB Flash, 8MB Octal PSRAM, dual-core LX7 @ 240MHz)
**Framework:** ESP-IDF v5.4
**BSP:** `esp32_s3_szp.h` / `esp32_s3_szp.c`

Key hardware facts baked into the AI system prompt (see `src/context/boards.js`):
- I2C bus: GPIO1 (SDA) / GPIO2 (SCL), shared by 5+ devices
- PCA9557 IO expander @ 0x19: BIT0=LCD_CS, BIT1=PA_EN, BIT2=DVP_PWDN
- ES7210 ADC @ **0x41** (not default 0x40), I2S TDM mode
- ES8311 DAC @ 0x18, I2S STD mode
- QMI8658 IMU @ **0x6A** (not 0x6B)
- LVGL v8.3.x — all calls need `lvgl_port_lock` / `lvgl_port_unlock`
- Speech recognition: I2S fixed 32000Hz/32bit, MP3 must be pre-converted

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Markdown | `react-markdown` + `react-syntax-highlighter` |
| AI Streaming | Fetch SSE — OpenAI-compatible + Anthropic native |
| Styling | CSS Variables, dark theme (GitHub dark palette) |
| Build | Vite → nginx:alpine (Docker multi-stage) |

## Project Structure

```
esp32-vibe-coder/
├── src/
│   ├── App.jsx              # Root layout: editor (55%) + chat (45%)
│   ├── App.css              # Shell, header, pane layout styles
│   ├── index.css            # CSS vars, reset, scrollbar, body
│   ├── main.jsx             # ReactDOM.createRoot entry
│   ├── context/
│   │   └── boards.js        # Board registry + AI system prompts
│   ├── utils/
│   │   └── aiApi.js         # streamChat() + PROVIDER_PRESETS
│   └── components/
│       ├── ChatPanel.jsx    # Streaming chat, code blocks, quick prompts
│       ├── ChatPanel.css
│       ├── SettingsModal.jsx # API key / base URL / model config
│       └── SettingsModal.css
├── Dockerfile               # Node 20 build → nginx:alpine serve
├── docker-compose.yml       # network_mode: host, nginx on port 4100
├── nginx.conf               # SPA routing, gzip, cache headers
└── .dockerignore
```

## Key Implementation Details

### AI API (`src/utils/aiApi.js`)
- `streamChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError })`
- Auto-detects Anthropic vs OpenAI-compatible by checking if baseUrl contains `anthropic`
- Anthropic: `POST /v1/messages`, `x-api-key` header, `anthropic-version: 2023-06-01`
- OpenAI: `POST /chat/completions`, `Bearer` auth, SSE `data:` parsing
- `PROVIDER_PRESETS`: OpenAI, Anthropic, DeepSeek, 阿里云百炼(Qwen), Groq, Ollama

### Board Context (`src/context/boards.js`)
- `BOARDS['szpi_esp32s3'].systemPrompt` — ~200-line condensed hardware context
- Injected as `{ role: 'system', content: board.systemPrompt }` on every API call
- Contains: all GPIO assignments, I2C addresses, BSP function signatures, 12 critical pitfalls

### Settings Storage
- localStorage key: `esp32-vibe-coder-settings`
- Fields: `baseUrl`, `apiKey`, `model`
- API key never leaves the browser

### Code Insert Flow
- AI response rendered via `ReactMarkdown` with custom `CodeBlock` component
- Each code block has "插入编辑器" button → calls `onInsertCode(code)` prop
- `App.jsx` passes `handleInsertCode` → replaces Monaco Editor content

## Development

```bash
# NODE_ENV=production skips devDependencies — always use --include=dev
npm install --include=dev
npm run dev       # Vite dev server on :5173
npm run build     # Output to dist/
```

## Docker Deployment

```bash
docker build -t esp32-vibe-coder:latest .
docker compose up -d
```

## Planned Extensions

1. **Cloud Compiler Backend** — ESP-IDF 5.4 Docker container + REST API (`/compile`, `/flash`)
2. **WebSerial Flasher** — `esptool-js` for one-click browser flashing
3. **Multi-board Support** — add more boards to `src/context/boards.js`
4. **Project persistence** — IndexedDB to save multiple files

## Repository

https://github.com/wangqioo/esp32-vibe-coder
