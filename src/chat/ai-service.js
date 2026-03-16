/**
 * AI Service - OpenAI-compatible API client with streaming support
 * V1.1: Dynamic system prompt via personality + memory integration, sentiment detection
 */

import { buildSystemPrompt, detectSentiment } from './personality.js';

export class AIService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.modelName = '';
    this.conversationHistory = [];

    // V1.1: personality & memory context
    this._personality = 'lively';
    this._affectionSystem = null;
    this._memoryManager = null;
    this.lastSentiment = 'neutral';
    this.lastFullResponse = '';
  }

  /**
   * Set context objects for dynamic prompt building.
   */
  setContext(personality, affectionSystem, memoryManager) {
    this._personality = personality || 'lively';
    this._affectionSystem = affectionSystem;
    this._memoryManager = memoryManager;
  }

  setPersonality(p) {
    this._personality = p || 'lively';
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

  _buildSystemPrompt() {
    const level = this._affectionSystem?.level || 1;
    const mood = this._affectionSystem?.mood || 'normal';
    const memories = this._memoryManager?.getTopMemories(10) || [];
    return buildSystemPrompt(this._personality, level, mood, memories);
  }

  async *sendMessageStream(userMessage) {
    if (!this.isConfigured()) {
      yield 'Please configure your API key in Settings first! (=^.^=)';
      return;
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const messages = [
      { role: 'system', content: this._buildSystemPrompt() },
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

        // V1.1: Detect sentiment from response
        this.lastFullResponse = fullResponse;
        this.lastSentiment = detectSentiment(fullResponse);

        // V1.1: Fire-and-forget memory extraction
        if (this._memoryManager) {
          this._memoryManager.extractMemories(userMessage, fullResponse).catch(() => {});
        }
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
