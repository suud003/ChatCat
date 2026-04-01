/**
 * AI Service - Chat orchestration via TriggerBus
 *
 * V7: 集成记忆意图检测 — 用户可通过对话管理记忆
 *     支持"记住..."、"忘记..."、"查看记忆"等指令
 *     记忆管理操作在发送给 AI 之前拦截处理
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

    // Callback for memory change events (UI refresh)
    this.onMemoryChanged = null;
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

  /**
   * 处理记忆管理意图（在发送给 AI 之前拦截）
   * 返回 { handled: boolean, response?: string }
   */
  async _handleMemoryIntent(userMessage) {
    if (!this._memoryManager) return { handled: false };

    const intent = this._memoryManager.detectMemoryIntent(userMessage);
    if (!intent) return { handled: false };

    switch (intent.type) {
      case 'add': {
        const result = await this._memoryManager.addUserMemory(intent.content);
        if (result) {
          const action = result.action === 'updated' ? '更新' : '记住';
          const response = `好的，我${action}了~ 📌 "${result.memory.content}"`;
          this._notifyMemoryChanged();
          return { handled: true, response };
        }
        return { handled: true, response: '嗯...这条信息我没能记住，再说一次？' };
      }

      case 'delete': {
        const deleted = this._memoryManager.deleteByKeyword(intent.content);
        if (deleted.length > 0) {
          const names = deleted.map(m => `"${m.content}"`).join('、');
          this._notifyMemoryChanged();
          return { handled: true, response: `好的，我忘掉了 ${deleted.length} 条记忆：${names}` };
        }
        return { handled: true, response: `我没有找到关于"${intent.content}"的记忆呢~` };
      }

      case 'view': {
        const display = this._memoryManager.formatMemoriesForDisplay();
        return { handled: true, response: display };
      }

      case 'update': {
        // 更新意图当作添加处理（addUserMemory 内部会自动合并相似记忆）
        const result = await this._memoryManager.addUserMemory(intent.content);
        if (result) {
          const action = result.action === 'updated' ? '更新' : '记住';
          this._notifyMemoryChanged();
          return { handled: true, response: `好的，已${action}~ 📌 "${result.memory.content}"` };
        }
        return { handled: true, response: '嗯...更新失败了，再试一次？' };
      }

      default:
        return { handled: false };
    }
  }

  _notifyMemoryChanged() {
    if (typeof this.onMemoryChanged === 'function') {
      try { this.onMemoryChanged(); } catch (e) { /* ignore */ }
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

    // V7: 先检测记忆管理意图
    const memoryResult = await this._handleMemoryIntent(userMessage);
    if (memoryResult.handled) {
      // 记忆管理操作不走 AI，直接返回结果
      // 但仍然记录到对话历史中
      this.conversationHistory.push({ role: 'user', content: userMessage });
      this.conversationHistory.push({ role: 'assistant', content: memoryResult.response });
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      await window.electronAPI.setStore('chatHistory', this.conversationHistory);
      yield memoryResult.response;
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
