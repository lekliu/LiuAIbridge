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
   wrangler secret put BRIDGE_TOKEN
   wrangler deploy
   ```
2. **管理**：访问 `你的域名/admin` 配置 API Keys。
3. **调用**：
   - 原始：`https://api.openai.com/v1/chat/completions`
   - 桥接：`https://你的域名/openai/v1/chat/completions`
   - 需携带 Header: `X-Bridge-Token: 你的BRIDGE_TOKEN`

### 🛠️ 本地开发与调试 (Local Development)

在正式部署到 Cloudflare 之前，建议先在本地环境验证配置。

#### 1. 准备环境

确保你已安装了 [Node.js](https://nodejs.org/) (推荐 LTS 版本)。

```bash
# 安装项目依赖
npm install
```

#### 2. 配置本地环境变量

在项目根目录下创建一个名为 `.dev.vars` 的文件（Wrangler 会自动读取它作为本地 Secret）：

```text
ADMIN_TOKEN=your_admin_password_123
BRIDGE_TOKEN=your_bridge_token_456
```

#### 3. 启动本地服务器

运行以下命令启动模拟环境：

```bash
npx wrangler dev
```

启动成功后，控制台会显示 `Ready on http://localhost:8788`。

#### 4. 初始化本地数据

由于本地环境使用模拟的 KV 存储，你需要先进入后台配置 API Key：

1.  在浏览器访问：`http://localhost:8788/admin`。
2.  输入你在 `.dev.vars` 中设置的 `ADMIN_TOKEN`。
3.  点击 **“添加新 Key”**，填入你的 Gemini/OpenAI 密钥。
4.  数据将保存到本地 `.wrangler` 文件夹中。

#### 5. 测试接口

你可以使用项目自带的 `test.py` 或 `curl` 进行验证：

**PowerShell 示例：**

```powershell
curl.exe -X POST "http://localhost:8788/google/v1beta/models/gemini-1.5-flash:generateContent" `
  -H "Content-Type: application/json" `
  -H "X-Bridge-Token: your_bridge_token_456" `
  -d '{"contents": [{"parts":[{"text": "你好"}]}]}'
```

#### 6. 注意事项

- **网络环境**：在本地调试时，Worker 运行在你自己的机器上。因此，你的电脑必须能够正常访问 Google 或 OpenAI 的 API 地址（即需要开启全局代理），否则会返回 `502 Bad Gateway`。
- **部署后**：一旦使用 `wrangler deploy` 发布，Worker 将运行在 Cloudflare 节点，届时无需本地代理即可实现国内直连。
