# ChatCat AI 配置教程

## 概述

ChatCat 桌面宠物内置 AI 聊天功能，支持多种 AI 服务商和自部署服务。只需配置 API 地址、密钥和模型名即可使用。

---

## 快速开始

1. 启动 ChatCat，鼠标悬停在猫上方，点击 **💬** 按钮
2. 点击顶部 **⚙ Settings** 标签页切换到设置
3. 选择 AI 服务预设（或自定义）
4. 填写 API Key
5. 点击 **Save**
6. 切回 **💬 Chat** 标签页，开始聊天

---

## 内置预设服务

| 预设 | 说明 | 需要 API Key | API Base URL |
|------|------|-------------|--------------|
| OpenAI | 官方 OpenAI API | 是（sk-...） | 自动填充 |
| Claude | Anthropic Claude（OpenAI 兼容端点） | 是 | 自动填充 |
| DeepSeek | DeepSeek API | 是 | 自动填充 |
| OpenRouter | 多模型聚合路由 | 是 | 自动填充 |
| Google Gemini | Google Gemini API | 是 | 自动填充 |
| OpenClaw | 自部署 OpenAI 兼容服务 | 视部署而定 | **需手动填写** |
| Custom | 任意 OpenAI 兼容 API | 视情况而定 | **需手动填写** |

---

## 接入 OpenClaw（自部署服务）

OpenClaw 是兼容 OpenAI API 格式的自部署推理服务。配置步骤：

### 1. 确认你的 OpenClaw 服务信息

你需要准备以下信息：

| 项目 | 示例 | 说明 |
|------|------|------|
| **API Base URL** | `http://192.168.1.100:8000/v1` | 你的 OpenClaw 服务地址，末尾加 `/v1` |
| **API Key** | `sk-xxx` 或留空 | 如果服务配置了认证则需要填写 |
| **Model Name** | `openclaw-7b` | 你部署的模型名称 |

> **如何获取模型名？** 在浏览器或终端访问 `http://你的服务地址/v1/models` 查看可用模型列表。

### 2. 在 ChatCat 中配置

1. 点击 **💬** → **⚙ Settings** 标签页
2. **AI Service Preset** 选择 `OpenClaw (Self-hosted)`
3. **API Base URL** 填写你的服务地址，例如：
   ```
   http://192.168.1.100:8000/v1
   ```
   - 如果服务部署在本机：`http://localhost:8000/v1`
   - 如果通过域名访问：`https://openclaw.your-domain.com/v1`
   - **注意**：URL 末尾要有 `/v1`，不要加 `/chat/completions`
4. **Model** 输入你的模型名称，例如 `openclaw-7b`
5. **API Key** 填写密钥（如果服务无需认证可随意填写一个值如 `none`）
6. 点击 **Save**

### 3. 验证

切回 Chat 标签页，发送一条消息测试。如果返回回复则配置成功。

### 常见问题

**Q: 提示 API Error 401**
> API Key 不正确，检查你的 OpenClaw 服务认证配置。

**Q: 提示 API Error 404**
> URL 地址不正确。确保填写的是 `/v1` 结尾的地址，ChatCat 会自动拼接 `/chat/completions`。

**Q: 提示网络错误 / Failed to fetch**
> 1. 检查服务是否在运行
> 2. 如果是 HTTPS，确认证书有效
> 3. 如果跨域，确认 OpenClaw 允许 CORS

**Q: 如何查看服务支持的模型？**
> 访问 `http://你的服务地址/v1/models`，返回的 JSON 中 `data[].id` 就是可用模型名。

---

## 接入自定义 OpenAI 兼容服务

选择 `Custom (OpenAI Compatible)` 预设，适用于：

- **vLLM** — `http://localhost:8000/v1`
- **Ollama** — `http://localhost:11434/v1`
- **LM Studio** — `http://localhost:1234/v1`
- **LocalAI** — `http://localhost:8080/v1`
- **Text Generation WebUI (oobabooga)** — `http://localhost:5000/v1`
- **FastChat** — `http://localhost:8000/v1`
- **任何 OpenAI Chat Completions 兼容端点**

配置方法与 OpenClaw 相同：填写 API Base URL、Model 名称和 API Key。

---

## 接入 OpenAI

1. 前往 [platform.openai.com](https://platform.openai.com/api-keys) 创建 API Key
2. 预设选择 `OpenAI`
3. 从下拉列表选择模型（推荐 `gpt-4.1` 或 `gpt-4o-mini`）
4. 粘贴 API Key
5. Save

---

## 接入 DeepSeek

1. 前往 [platform.deepseek.com](https://platform.deepseek.com/) 获取 API Key
2. 预设选择 `DeepSeek`
3. 选择模型 `deepseek-chat`（日常对话）或 `deepseek-reasoner`（推理任务）
4. 粘贴 API Key
5. Save

---

## 接入 Google Gemini

1. 前往 [aistudio.google.com](https://aistudio.google.com/apikey) 获取 API Key
2. 预设选择 `Google Gemini`
3. 选择模型（推荐 `gemini-2.5-flash`）
4. 粘贴 API Key
5. Save

---

## 接入 OpenRouter

OpenRouter 聚合了多家模型提供商，一个 Key 即可使用 OpenAI / Claude / Gemini / DeepSeek 等模型。

1. 前往 [openrouter.ai](https://openrouter.ai/keys) 获取 API Key
2. 预设选择 `OpenRouter`
3. 从下拉列表选择任意模型
4. 粘贴 API Key
5. Save

---

## 技术说明

ChatCat 使用 **OpenAI Chat Completions** 标准格式：

```
POST {API_BASE_URL}/chat/completions
Headers: Authorization: Bearer {API_KEY}
Body: { model, messages, stream: true, max_tokens: 500, temperature: 0.8 }
```

任何兼容此格式的服务都可以通过 Custom 预设接入。响应需要支持 SSE streaming（`data: {...}` 格式）。
