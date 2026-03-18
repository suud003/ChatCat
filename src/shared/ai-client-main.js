/**
 * AI Client for Main Process — unified OpenAI-compatible API client.
 *
 * Centralizes all AI HTTP calls made from the Electron main process.
 * Supports three modes:
 *   - complete()  — non-streaming chat completions (skills, OCR, etc.)
 *   - stream()    — streaming SSE chat completions (Quick Panel)
 *   - vision()    — non-streaming with image content (screenshot OCR)
 *
 * Runs in main process only. Uses Electron `net.fetch`.
 */

const { net } = require('electron');

class AIClientMain {
  /**
   * @param {import('electron-store')} store - electron-store instance
   */
  constructor(store) {
    this._store = store;
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Non-streaming chat completion.
   *
   * @param {Object} opts
   * @param {string}          [opts.prompt]       — shorthand: single user message
   * @param {Array}           [opts.messages]     — full messages array (overrides prompt)
   * @param {string}          [opts.model]        — model override (defaults to store)
   * @param {number}          [opts.temperature]  — default 0.4
   * @param {number}          [opts.maxTokens]    — default 2000
   * @returns {Promise<string>} AI response text
   */
  async complete({ prompt, messages, model, temperature = 0.4, maxTokens = 2000 } = {}) {
    const config = this._getConfig();
    this._validateConfig(config);

    const body = {
      model: model || config.modelName,
      messages: messages || [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    };

    const url = `${config.apiBaseUrl}/chat/completions`;
    console.log(`[AIClient] complete: model=${body.model}, url=${url}`);

    const response = await this._fetch(url, config, body);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message || 'AI API error');
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI 未返回有效内容: ' + JSON.stringify(json).substring(0, 200));
    }
    return content;
  }

  /**
   * Streaming SSE chat completion.
   *
   * @param {Object} opts
   * @param {Array}           opts.messages      — full messages array
   * @param {Function}        [opts.onChunk]     — called with each content chunk
   * @param {string}          [opts.model]       — model override
   * @param {number}          [opts.temperature] — default 0.4
   * @param {number}          [opts.maxTokens]   — default 800
   * @returns {Promise<string>} full concatenated result
   */
  async stream({ messages, onChunk, model, temperature = 0.4, maxTokens = 800 } = {}) {
    const config = this._getConfig();
    this._validateConfig(config);

    const body = {
      model: model || config.modelName,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    };

    const url = `${config.apiBaseUrl}/chat/completions`;
    console.log(`[AIClient] stream: model=${body.model}, url=${url}, input=${messages.length} msgs`);

    const response = await this._fetch(url, config, body);
    const result = await this._readSSEStream(response, onChunk);

    console.log(`[AIClient] stream done: ${result.length} chars`);
    if (!result) {
      console.warn('[AIClient] ⚠️ stream returned empty result');
    }

    return result;
  }

  /**
   * Vision (multimodal) completion — non-streaming.
   *
   * @param {Object} opts
   * @param {string}          opts.base64        — base64-encoded image (no data: prefix)
   * @param {string}          [opts.textPrompt]  — text alongside the image
   * @param {string}          [opts.model]       — model override (defaults to store visionModel)
   * @param {number}          [opts.maxTokens]   — default 2000
   * @param {number}          [opts.temperature] — default 0.2
   * @returns {Promise<string>} AI response text
   */
  async vision({ base64, textPrompt, model, maxTokens = 2000, temperature = 0.2 } = {}) {
    const config = this._getConfig();
    this._validateConfig(config);

    const visionModel = model || this._store.get('visionModel') || config.modelName;

    // Check image size for detail level
    const imageSizeMB = (base64.length * 3 / 4) / (1024 * 1024);
    console.log(`[AIClient] vision: model=${visionModel}, image=${imageSizeMB.toFixed(2)}MB`);

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: textPrompt || '请识别并描述这张图片的内容。如果包含文字，请提取文字；如果包含代码，请保留代码格式。'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
              detail: imageSizeMB > 4 ? 'low' : 'high'
            }
          }
        ]
      }
    ];

    const body = {
      model: visionModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    const url = `${config.apiBaseUrl}/chat/completions`;

    // 使用 net.fetch 直接请求，不走 _fetch 自动错误处理，以便 vision 专属错误提示生效
    let response;
    try {
      response = await net.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      throw new Error(`网络请求失败: ${fetchErr.message}`);
    }

    // Vision-specific error hints
    if (!response.ok) {
      const detail = await this._parseErrorBody(response);
      console.error(`[AIClient] Vision API 错误 ${response.status}: model=${visionModel}`, detail);
      if (response.status === 500 || response.status === 400) {
        throw new Error(
          `Vision API 错误 (${response.status})。当前模型: "${visionModel}"。` +
          `该模型可能不支持图片识别，请在设置中将 visionModel 配置为支持 Vision 的模型` +
          `（如 gpt-4o、gpt-4o-mini、gpt-4-vision-preview、claude-3-5-sonnet 等）。` +
          (detail ? `\n详情: ${detail}` : '')
        );
      } else if (response.status === 401) {
        throw new Error('API Key 无效或已过期，请检查设置');
      } else if (response.status === 413) {
        throw new Error('截图图片过大，请尝试选择更小的区域');
      }
      throw new Error(`Vision API 错误 (${response.status}): ${detail || '未知错误'}`);
    }

    console.log(`[AIClient] Vision response status: ${response.status}`);
    
    const rawText = await response.text();
    console.log(`[AIClient] Vision raw response (first 800 chars):`, rawText.substring(0, 800));
    
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`[AIClient] Vision JSON 解析失败:`, parseErr.message);
      throw new Error(`图片识别返回了非 JSON 内容，可能是 API 地址或模型配置错误。\n返回内容: ${rawText.substring(0, 200)}`);
    }
    
    const content = json.choices?.[0]?.message?.content;

    // 详细日志：当 content 为空时输出完整响应
    if (!content) {
      console.error(`[AIClient] Vision 返回空内容! model=${visionModel}, full response:`, rawText.substring(0, 800));
      throw new Error(
        `图片识别返回空内容。当前模型: "${visionModel}"。` +
        `API 返回: ${rawText.substring(0, 300)}\n` +
        `请检查该模型是否支持图片输入(vision)。`
      );
    }

    return content;
  }

  // ─── Config helpers ────────────────────────────────────────────

  /** Read AI config from store */
  _getConfig() {
    return {
      apiBaseUrl: this._store.get('apiBaseUrl') || 'https://api.openai.com/v1',
      apiKey:     this._store.get('apiKey') || '',
      modelName:  this._store.get('modelName') || 'gpt-3.5-turbo',
    };
  }

  /** Check that essential fields are present */
  _validateConfig(config) {
    if (!config.apiBaseUrl || !config.apiKey) {
      throw new Error('请先在设置中配置 API 地址和 API Key');
    }
  }

  // ─── HTTP helpers ──────────────────────────────────────────────

  /**
   * Central fetch wrapper — every AI request goes through here.
   * Uses Electron `net.fetch` which respects system proxy settings.
   */
  async _fetch(url, config, body) {
    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok && !body.stream) {
      // For non-streaming, parse and throw immediately
      const detail = await this._parseErrorBody(response);
      console.error(`[AIClient] API 错误 ${response.status}:`, detail);
      throw new Error(`API 错误 (${response.status}): ${detail || '未知错误'}`);
    }

    if (!response.ok && body.stream) {
      // For streaming, also throw (caller expects a readable response)
      const detail = await this._parseErrorBody(response);
      console.error(`[AIClient] API 错误 ${response.status}:`, detail);
      throw new Error(`API 错误 (${response.status}): ${detail || '未知错误'}`);
    }

    return response;
  }

  /**
   * Read an SSE stream and call onChunk for each content delta.
   * Handles both "data: {json}" and "data:{json}" formats.
   *
   * THIS IS THE SINGLE SOURCE OF TRUTH for SSE parsing in the main process.
   */
  async _readSSEStream(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResult = '';
    let buffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data')) continue;

        // Compatible with "data: {json}" and "data:{json}" SSE formats
        const data = trimmed.startsWith('data: ')
          ? trimmed.slice(6)
          : trimmed.slice(5);
        const cleaned = data.trim();
        if (cleaned === '[DONE]') break;

        try {
          const json = JSON.parse(cleaned);
          const chunk = json.choices?.[0]?.delta?.content;
          if (chunk) {
            fullResult += chunk;
            chunkCount++;
            if (onChunk) onChunk(chunk);
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }

    console.log(`[AIClient] SSE: ${chunkCount} chunks received`);
    return fullResult;
  }

  /** Try to extract a human-readable error message from an API error response */
  async _parseErrorBody(response) {
    try {
      const errBody = await response.json();
      return errBody.error?.message || JSON.stringify(errBody);
    } catch {
      return await response.text().catch(() => '');
    }
  }
}

module.exports = { AIClientMain };
