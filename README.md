![License](https://img.shields.io/github/license/lekliu/LiuAIbridge)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare_Workers-F38020?logo=cloudflare-workers&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)

# 🌉 LiuAIbridge
**一个轻量级、安全、带 UI 的 AI API 边缘网关。**

部署在 Cloudflare Workers 上，旨在解决国内开发者直连访问 Google Gemini, OpenAI, Anthropic 等 API 的痛点。

### ✨ 特性
- **国内直连**：无需本地代理，通过 Cloudflare 全球加速。
- **可视化后台**：内置 `/admin` 仪表盘，图形化管理各平台 API Key。
- **多模型支持**：统一转发 Google、OpenAI、Anthropic 请求。
- **安全加固**：API Key 存储于 KV 空间，请求采用 Header 鉴权（X-Bridge-Token）。
- **流式传输**：原生支持流式响应（Streaming），无延迟体验。

### 🚀 快速开始
1. **部署**：
   ```bash
   wrangler kv namespace create LIU_BRIDGE_KV
   wrangler secret put ADMIN_TOKEN
   wrangler deploy
   ```
2. **管理**：访问 `你的域名/admin` 配置 API Keys。
3. **调用**：
   - 原始：`https://api.openai.com/v1/chat/completions`
   - 桥接：`https://你的域名/openai/v1/chat/completions`
   - 需携带 Header: `X-Bridge-Token: 你的ADMIN_TOKEN`
