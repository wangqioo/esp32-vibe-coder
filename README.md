# ESP32 Vibe Coder

> 面向 **立创实战派ESP32-S3** 的 AI 辅助嵌入式开发 Web IDE

在浏览器里用自然语言描述需求，AI 自动生成带完整硬件上下文的 ESP-IDF v5.4 C 代码，一键插入编辑器。

![screenshot](https://github.com/wangqioo/esp32-vibe-coder/raw/main/docs/screenshot.png)

---

## 功能特性

- **硬件上下文包** — AI 系统提示自动注入开发板全部引脚、外设地址、BSP 函数签名，生成的代码开箱即用
- **流式 AI 对话** — 支持 OpenAI 兼容接口 + Anthropic 原生 API，自带 6 个主流提供商预设
- **Monaco 代码编辑器** — C 语言语法高亮、JetBrains Mono 字体、VS Dark 主题
- **一键插入** — AI 回复中每个代码块都有「插入编辑器」按钮
- **自带 API Key** — 用户自行填写 Key，不经过任何后端，数据留在浏览器本地
- **Docker 一键部署** — 多阶段构建，nginx 静态服务，体积小

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

## 快速开始

### 本地开发

```bash
git clone https://github.com/wangqioo/esp32-vibe-coder.git
cd esp32-vibe-coder
npm install --include=dev
npm run dev
# 打开 http://localhost:5173
```

### Docker 部署

```bash
docker compose up -d --build
# 打开 http://localhost:80
```

## 使用说明

1. 点击右上角 **⚙ 配置 AI**，填入 API Base URL、API Key 和模型名称
2. 在右侧聊天框用中文描述需求，例如：
   - `帮我写一个点亮屏幕显示 Hello World 的完整例程`
   - `帮我写一个读取 QMI8658 加速度计数据的代码`
3. AI 回复中点击 **插入编辑器** 将代码同步到左侧编辑器
4. 从编辑器复制代码到你的 ESP-IDF 工程

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

## 技术栈

- **React 18** + **Vite 5**
- **Monaco Editor** (`@monaco-editor/react`)
- **react-markdown** + **react-syntax-highlighter**
- **Fetch SSE** 流式 AI 接口
- **nginx:alpine** 静态托管

## 路线图

- [ ] 云端编译器 — ESP-IDF 5.4 容器 + REST API
- [ ] WebSerial 一键烧录 — `esptool-js`
- [ ] 多文件项目支持
- [ ] 更多开发板适配

## License

MIT
