/**
 * AI Service - OpenAI-compatible API client with streaming support
 */

export class AIService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.modelName = '';
    this.conversationHistory = [];
    this.systemPrompt = `You are ChatCat, a cute and helpful desktop pet cat. You speak in a friendly, playful manner. Keep responses concise (1-3 sentences unless asked for more detail). You can use simple kaomoji occasionally like (=^.^=) or (>^ω^<). You help with questions, tell jokes, and keep the user company.`;
  }

  async loadConfig() {
    this.baseUrl = await window.electronAPI.getStore('apiBaseUrl') || 'https://api.openai.com/v1';
    this.apiKey = await window.electronAPI.getStore('apiKey') || '';
    this.modelName = await window.electronAPI.getStore('modelName') || 'gpt-3.5-turbo';

    const history = await window.electronAPI.getStore('chatHistory');
    if (Array.isArray(history)) {
      this.conversationHistory = history.slice(-20); // Keep last 20 messages
    }
  }

  isConfigured() {
    return this.apiKey && this.apiKey.length > 0;
  }

  async *sendMessageStream(userMessage) {
    if (!this.isConfigured()) {
      yield 'Please configure your API key in Settings first! (=^.^=)';
      return;
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: messages,
          stream: true,
          max_tokens: 500,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText.substring(0, 200)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              yield content;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Save to history
      if (fullResponse) {
        this.conversationHistory.push({ role: 'assistant', content: fullResponse });
        // Keep history manageable
        if (this.conversationHistory.length > 40) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
        await window.electronAPI.setStore('chatHistory', this.conversationHistory);
      }

    } catch (error) {
      yield `\n[Error: ${error.message}]`;
      // Remove the failed user message from history
      this.conversationHistory.pop();
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    window.electronAPI.setStore('chatHistory', []);
  }
}
