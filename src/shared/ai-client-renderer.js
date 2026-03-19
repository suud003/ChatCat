/**
 * AI Client for Renderer Process — unified OpenAI-compatible API client.
 *
 * Centralizes all AI HTTP calls made from the Electron renderer process.
 * Supports two modes:
 *   - complete()  — non-streaming chat completions (memory extraction, todo parsing)
 *   - stream()    — streaming SSE chat completions (main chat)
 *
 * Uses browser `fetch` API.
 */

export class AIClientRenderer {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.modelName = '';
    this.apiPreset = 'custom';
    this.enableThinking = false;
  }

  /** Load config from electron-store via IPC */
  async loadConfig() {
    this.baseUrl = await window.electronAPI.getStore('apiBaseUrl') || 'https://api.openai.com/v1';
    this.apiKey = await window.electronAPI.getStore('apiKey') || '';
    this.modelName = await window.electronAPI.getStore('modelName') || 'gpt-3.5-turbo';
    this.apiPreset = await window.electronAPI.getStore('apiPreset') || 'custom';
    this.enableThinking = await window.electronAPI.getStore('enableThinking') === true;
  }

  /** Manually set config (used by AIService which manages its own config) */
  setConfig(baseUrl, apiKey, modelName, apiPreset = 'custom', enableThinking = false) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.apiPreset = apiPreset;
    this.enableThinking = enableThinking === true;
  }

  isConfigured() {
    if (!this.baseUrl) return false;
    return this._requiresApiKey() ? !!this.apiKey : true;
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Non-streaming chat completion.
   *
   * @param {Object} opts
   * @param {string}  [opts.prompt]       — shorthand: single user message
   * @param {Array}   [opts.messages]     — full messages array (overrides prompt)
   * @param {string}  [opts.model]        — model override
   * @param {number}  [opts.temperature]  — default 0.4
   * @param {number}  [opts.maxTokens]    — default 200
   * @returns {Promise<string>} AI response text
   */
  async complete({ prompt, messages, model, temperature = 0.4, maxTokens = 200 } = {}) {
    this._validateConfig();

    const body = {
      model: model || this.modelName,
      messages: messages || [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    };
    await this._applyThinkingOptions(body);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this._buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI 未返回有效内容');
    }
    return content;
  }

  /**
   * Streaming SSE chat completion — yields content chunks.
   *
   * @param {Object} opts
   * @param {Array}   opts.messages      — full messages array
   * @param {string}  [opts.model]       — model override
   * @param {number}  [opts.temperature] — default 0.8
   * @param {number}  [opts.maxTokens]   — default 500
   * @returns {AsyncGenerator<string>} yields content chunks
   */
  async *stream({ messages, model, temperature = 0.8, maxTokens = 500 } = {}) {
    this._validateConfig();

    const body = {
      model: model || this.modelName,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    };
    await this._applyThinkingOptions(body);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this._buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    yield* this._readSSEStream(response);
  }

  /**
   * Test API connection with given credentials (non-streaming).
   */
  async testConnection(apiUrl, apiKey, modelName, options = {}) {
    const requiresApiKey = this._requiresApiKey({
      baseUrl: apiUrl,
      apiPreset: options.preset,
    });
    if (requiresApiKey && !apiKey) throw new Error('API Key is empty');

    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const testMessage = (options.testMessage || '请回复：连接测试通过').trim();
    const startAt = performance.now();
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: testMessage }],
        max_tokens: 128,
        stream: false,
      }),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch {}
      throw new Error(`HTTP ${response.status}: ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response format');
    }
    const latencyMs = Math.round(performance.now() - startAt);
    const output = data.choices?.[0]?.message?.content || '';
    return { ok: true, latencyMs, output };
  }

  // ─── Internal helpers ──────────────────────────────────────────

  _buildHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  _validateConfig() {
    const missingBaseUrl = !this.baseUrl;
    const missingApiKey = this._requiresApiKey() && !this.apiKey;
    if (missingBaseUrl || missingApiKey) {
      throw new Error(missingBaseUrl
        ? '请先在设置中配置 API 地址'
        : '请先在设置中配置 API Key');
    }
  }

  async _applyThinkingOptions(body) {
    if (!this.enableThinking) return;
    const baseUrl = String(this.baseUrl || '').toLowerCase();
    const modelName = String(body.model || '').toLowerCase();
    const isDashScope = baseUrl.includes('dashscope.aliyuncs.com') || baseUrl.includes('aliyuncs.com');
    const isGptOss = modelName.includes('gpt-oss');

    if (isDashScope && !isGptOss) {
      const rawBudget = Number(await window.electronAPI.getStore('thinkingBudgetTokens'));
      body.enable_thinking = true;
      body.thinking_budget = Number.isFinite(rawBudget) && rawBudget > 0 ? Math.floor(rawBudget) : 1024;
      return;
    }

    const rawEffort = await window.electronAPI.getStore('thinkingEffort');
    const effort = String(rawEffort || 'medium').toLowerCase();
    const allowed = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    body.reasoning_effort = allowed.has(effort) ? effort : 'medium';
  }

  _requiresApiKey(config = {}) {
    const preset = config.apiPreset ?? this.apiPreset;
    const baseUrl = (config.baseUrl ?? this.baseUrl ?? '').toLowerCase();
    if (preset === 'ollama') return false;
    if (baseUrl.includes('://127.0.0.1:11434') || baseUrl.includes('://localhost:11434')) {
      return false;
    }
    return true;
  }

  /**
   * Read an SSE stream, yielding content chunks.
   * Handles both "data: {json}" and "data:{json}" formats.
   *
   * THIS IS THE SINGLE SOURCE OF TRUTH for SSE parsing in the renderer process.
   */
  async *_readSSEStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data')) continue;

        // Compatible with "data: {json}" and "data:{json}" SSE formats
        const data = trimmed.startsWith('data: ')
          ? trimmed.slice(6)
          : trimmed.slice(5);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  }
}
