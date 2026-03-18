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
  }

  /** Load config from electron-store via IPC */
  async loadConfig() {
    this.baseUrl = await window.electronAPI.getStore('apiBaseUrl') || 'https://api.openai.com/v1';
    this.apiKey = await window.electronAPI.getStore('apiKey') || '';
    this.modelName = await window.electronAPI.getStore('modelName') || 'gpt-3.5-turbo';
  }

  /** Manually set config (used by AIService which manages its own config) */
  setConfig(baseUrl, apiKey, modelName) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  isConfigured() {
    return this.apiKey && this.apiKey.length > 0;
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
  async testConnection(apiUrl, apiKey, modelName) {
    if (!apiKey) throw new Error('API Key is empty');

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 5,
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
    return true;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  _buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  _validateConfig() {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('请先在设置中配置 API 地址和 API Key');
    }
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
