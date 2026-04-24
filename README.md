# ESP32 Vibe Coder

> 面向 **立创实战派ESP32-S3** 的 AI 辅助嵌入式开发 Web IDE

在浏览器里用自然语言描述需求，AI 自动生成带完整硬件上下文的 ESP-IDF v5.4 C 代码；编译、烧录、日志分析全部在浏览器内完成，**无需安装任何工具链**。

---

## 功能特性

### AI 辅助编码
- **硬件上下文包** — AI 系统提示自动注入开发板全部引脚、外设地址、BSP 函数签名，生成的代码开箱即用
- **流式 AI 对话** — 支持 OpenAI 兼容接口 + Anthropic 原生 API，内置 6 个主流提供商预设
- **Monaco 代码编辑器** — C 语言语法高亮、JetBrains Mono 字体、VS Dark 主题
- **一键插入** — AI 回复中每个代码块都有「插入编辑器」按钮

### 云端编译
- **云编译器** — ESP-IDF v5.4 Docker 容器暴露 REST API，浏览器发送代码，返回 `.bin` 固件
- **一键下载 .bin** — 编译成功后可直接下载固件文件

### 无线烧录（OTA）
- **WiFi OTA** — 设备运行 OTA 固件后，通过 HTTP 推送新固件，进度条实时显示，自动重启
- **BLE OTA** — 无需 WiFi，通过 **Web Bluetooth API** 直接蓝牙烧录，512 字节 MTU 高速传输

### 设备日志
- **WiFi WebSocket 日志流** — 实时接收 ESP32 日志，按级别过滤（E/W/I/D/V），关键字搜索
- **WebSerial 串口日志** — USB 直连串口，115200 baud，无需驱动
- **AI 日志分析** — 一键将日志发送给 AI，自动定位错误原因并给出修复建议

---

## 完整工作流

```
描述需求 → AI 生成代码 → 云端编译 → WiFi OTA / BLE 烧录 → 实时查看日志 → AI 分析报错
```

**第一次** 需要 USB 烧录 `ota-firmware/`（OTA 引导固件），之后所有更新均可无线完成。

---

## 支持的 AI 提供商

| 提供商 | Base URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 阿里云百炼 (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Ollama (本地) | `http://localhost:11434/v1` |

任何 OpenAI 兼容接口均可使用。

---

## 快速开始

### Web IDE（前端）

```bash
git clone https://github.com/wangqioo/esp32-vibe-coder.git
cd esp32-vibe-coder
npm install --include=dev
npm run dev
# 打开 http://localhost:5173
```

### 云编译器（后端）

```bash
cd compiler-service
docker build -t esp32-compiler .
docker run -d -p 8760:8760 esp32-compiler
# 开发环境会通过 Vite 代理 /compile 到 http://127.0.0.1:8760
# 生产环境由 nginx 将 /compile 代理到 http://127.0.0.1:8760
```

### OTA 引导固件（首次烧录）

```bash
cd ota-firmware
# 修改 sdkconfig 中的 WiFi SSID / Password
idf.py menuconfig   # Component config → OTA WiFi
idf.py build flash monitor
```

---

## 使用说明

1. 点击右上角 **⚙ 配置 AI**，填入 API Base URL、API Key 和模型名称
   > API Key 仅保存在当前浏览器本地；请勿在共享或不可信设备上保存真实密钥。
2. 在右侧聊天框用中文描述需求：
   - `帮我写一个点亮屏幕显示 Hello World 的完整例程`
   - `帮我写一个读取 QMI8658 加速度计数据的代码`
   - `帮我实现 WiFi 扫描并连接功能`
3. AI 回复中点击 **插入编辑器** 将代码同步到左侧编辑器
4. 点击 **▶ 编译** → 填入云编译器地址 → 等待编译完成
5. 编译成功后选择烧录方式：
   - **WiFi OTA** — 填入设备 IP，点击「↑ 推送 OTA」
   - **BLE 烧录** — 点击「⬡ BLE 烧录」，在 Chrome 弹窗选择设备
6. 切换到 **📟 设备日志** 标签查看运行日志，可点击「✨ AI 分析」定位问题

---

## BLE OTA 协议

| 方向 | 特征值 | 内容 |
|---|---|---|
| 浏览器 → 设备 | CTRL (write) | `[0x01, size(4B)]` 开始 / `[0x02]` 提交 / `[0x03]` 放弃 |
| 浏览器 → 设备 | DATA (write-no-rsp) | 固件块，最大 509 字节 (MTU-3) |
| 设备 → 浏览器 | STATUS (notify) | `[0x00]` 就绪 / `[0x01, offset(4B)]` 进度 / `[0x02]` 成功 / `[0x03, msg]` 错误 |

> BLE OTA 需要 **Chrome / Edge 桌面版**，设备广播名称为 `ESP32-Vibe-OTA`。

---

## 目标硬件

**立创实战派ESP32-S3**（SZPI）

| 项目 | 参数 |
|---|---|
| 模组 | ESP32-S3-WROOM-1-N16R8 |
| Flash | 16MB |
| PSRAM | 8MB Octal |
| 主频 | 240MHz 双核 LX7 |
| 框架 | ESP-IDF v5.4 |
| BSP | `esp32_s3_szp.h` |

AI 预置的硬件陷阱提示（防止生成错误代码）：
- ES7210 I2C 地址 `0x41`，非默认 `0x40`
- QMI8658 I2C 地址 `0x6A`，非 `0x6B`
- 所有 LVGL 调用需加 `lvgl_port_lock` / `lvgl_port_unlock`
- LCD CS 由 PCA9557 IO 扩展芯片控制，非直接 GPIO

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + Vite 5 |
| 代码编辑器 | Monaco Editor (`@monaco-editor/react`) |
| Markdown 渲染 | react-markdown + react-syntax-highlighter |
| AI 接口 | Fetch SSE（OpenAI 兼容）+ Anthropic 原生 |
| 串口日志 | Web Serial API |
| BLE 烧录 | Web Bluetooth API |
| 云编译器 | Flask + gunicorn on `espressif/idf:v5.4` |
| ESP32 BLE 栈 | NimBLE (ESP-IDF 内置) |
| 部署 | nginx:alpine (Docker 多阶段构建) |

---

## 项目结构

```
esp32-vibe-coder/
├── src/                     # React 前端
│   ├── App.jsx              # 根布局：编辑器 55% + 右侧面板 45%
│   ├── components/
│   │   ├── ChatPanel.jsx    # AI 对话面板
│   │   ├── LogPanel.jsx     # 设备日志（WiFi WS + WebSerial）
│   │   ├── CompilePanel.jsx # 编译 + WiFi OTA + BLE OTA
│   │   └── SettingsModal.jsx
│   ├── utils/
│   │   ├── aiApi.js         # 流式 AI 接口
│   │   ├── compiler.js      # 云编译器 REST 调用
│   │   ├── ota.js           # WiFi OTA HTTP 推送
│   │   ├── bleOta.js        # BLE OTA Web Bluetooth 客户端
│   │   └── logStream.js     # WebSocket + WebSerial 日志流
│   └── context/boards.js    # 开发板注册表 + AI 系统提示
├── compiler-service/        # 云编译器 Docker 服务
│   ├── server.py            # Flask REST API
│   ├── Dockerfile           # espressif/idf:v5.4 基础镜像
│   └── template/            # ESP-IDF 工程模板
└── ota-firmware/            # OTA 引导固件（首次 USB 烧录）
    └── main/
        ├── main.c           # WiFi + HTTP OTA + WebSocket 日志
        ├── ota_ble.c        # NimBLE BLE OTA GATT 服务
        └── ota_ble.h
```

---

## License

MIT
