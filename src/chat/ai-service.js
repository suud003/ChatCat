/**
 * AI Service - Chat orchestration via TriggerBus
 *
 * V6: Phase 5 — Chat system prompt now built entirely in Main process
 *     by PromptRegistry 'chat-system-prompt' v2.0.0 resolver, using
 *     ContextHub-assembled data (personality, memory, behavior, todo).
 *     This module no longer builds system prompts or injects context.
 *
 * Scene: chat.default / chat.followup (AI Runtime SceneRegistry)
 * Model config sourced from AI Runtime ModelProfiles 'chat-stream' (via Main AIRuntime).
 */

import { detectSentiment } from './personality.js';

export class AIService {
  constructor() {
    this._triggerBus = null;  // TriggerBusRenderer, set via setTriggerBus()
    this.conversationHistory = [];

    // Sentiment tracking (for cat expression animation)
    this.lastSentiment = 'neutral';
    this.lastFullResponse = '';

    // Memory manager reference (for fire-and-forget extraction after each response)
    this._memoryManager = null;
  }

  /**
   * Phase 3: Set TriggerBusRenderer for unified trigger bus.
   * @param {import('../ai-runtime/trigger-bus-renderer').TriggerBusRenderer} triggerBus
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }

  /**
   * Set memory manager for post-response memory extraction.
   * @param {import('./memory-manager').MemoryManager} memoryManager
   */
  setMemoryManager(memoryManager) {
    this._memoryManager = memoryManager;
  }

  async loadConfig() {
    const history = await window.electronAPI.getStore('chatHistory');
    if (Array.isArray(history)) {
      this.conversationHistory = history.slice(-20); // Keep last 20 messages
    }
  }

  /**
   * Phase 4: Check if AI is configured via Main process IPC.
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    try {
      return await window.electronAPI.isAIConfigured();
    } catch {
      return false;
    }
  }

  async *sendMessageStream(userMessage) {
    if (!await this.isConfigured()) {
      yield 'Please configure your API key in Settings first! (=^.^=)';
      return;
    }

    if (!this._triggerBus) {
      yield '[Error: TriggerBus not available]';
      return;
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    try {
      let fullResponse = '';

      const trigger = {
        type: 'chat',
        sceneId: 'chat.default',
        payload: {
          // System prompt is now built by Main-side PromptRegistry v2.0.0
          // using ContextHub-assembled context (personality, memory, behavior, todo).
          // Only conversation history is passed from Renderer.
          history: this.conversationHistory,
        },
      };

      for await (const chunk of this._triggerBus.submitAndStream(trigger, { priority: 'HIGH' })) {
        fullResponse += chunk;
        yield chunk;
      }

      // Save to history
      if (fullResponse) {
        this.conversationHistory.push({ role: 'assistant', content: fullResponse });
        // Keep history manageable
        if (this.conversationHistory.length > 40) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
        await window.electronAPI.setStore('chatHistory', this.conversationHistory);

        // Detect sentiment from response (for cat expression animation)
        this.lastFullResponse = fullResponse;
        this.lastSentiment = detectSentiment(fullResponse);

        // Fire-and-forget memory extraction
        if (this._memoryManager) {
          this._memoryManager.extractMemories(userMessage, fullResponse).catch(err => {
            console.error('[AIService] Memory extraction failed:', err);
          });
        }
      }

    } catch (error) {
      console.error('[AIService] Stream Error:', error);
      yield `\n[Error: ${error.message}]`;
      // Remove the failed user message from history
      this.conversationHistory.pop();
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    window.electronAPI.setStore('chatHistory', []);
  }

  /**
   * Phase 4: Test API Connection via Main process IPC.
   */
  async testConnection(apiUrl, apiKey, modelName, options = {}) {
    return window.electronAPI.testAIConnection(apiUrl, apiKey, modelName, options);
  }
}
