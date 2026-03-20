/**
 * AI Service - Chat orchestration via TriggerBus
 *
 * V5: Phase 4 — All AI calls via Main TriggerBus.
 *     Renderer makes ZERO direct AI HTTP calls.
 *     Prompt building stays here (uses Renderer-only data: personality, rhythm, memories).
 *
 * Scene: chat.default / chat.followup (AI Runtime SceneRegistry)
 * Model config sourced from AI Runtime ModelProfiles 'chat-stream' (via Main AIRuntime).
 * Prompt corresponds to AI Runtime PromptRegistry 'chat-system-prompt' (dynamic via personality.js).
 * Context providers: personality, history, memory, behavior.
 */

import { buildSystemPrompt, detectSentiment } from './personality.js';

export class AIService {
  constructor() {
    this._triggerBus = null;  // TriggerBusRenderer, set via setTriggerBus()
    this.conversationHistory = [];

    // V1.1: personality & memory context
    this._personality = 'lively';
    this._affectionSystem = null;
    this._memoryManager = null;
    this.lastSentiment = 'neutral';
    this.lastFullResponse = '';

    // V2: rhythm context
    this._rhythmAnalyzer = null;
    this._compositeEngine = null;

    // V2: todo context
    this._todoList = null;
  }

  /**
   * Phase 3: Set TriggerBusRenderer for unified trigger bus.
   * @param {import('../ai-runtime/trigger-bus-renderer').TriggerBusRenderer} triggerBus
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }

  /**
   * Set context objects for dynamic prompt building.
   */
  setContext(personality, affectionSystem, memoryManager) {
    this._personality = personality || 'lively';
    this._affectionSystem = affectionSystem;
    this._memoryManager = memoryManager;
  }

  /**
   * V2: Set rhythm modules for activity context injection
   */
  setRhythmContext(rhythmAnalyzer, compositeEngine) {
    this._rhythmAnalyzer = rhythmAnalyzer;
    this._compositeEngine = compositeEngine;
  }

  /**
   * Set TodoList for injecting todo data into system prompt.
   * @param {import('../widgets/todo-list').TodoList} todoList
   */
  setTodoList(todoList) {
    this._todoList = todoList;
  }

  setPersonality(p) {
    this._personality = p || 'lively';
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

  _buildSystemPrompt() {
    const level = this._affectionSystem?.level || 1;
    const mood = this._affectionSystem?.mood || 'normal';
    const memories = this._memoryManager?.getTopMemories(10) || [];
    let prompt = buildSystemPrompt(this._personality, level, mood, memories);

    // V2: Inject real-time rhythm data if available
    if (this._rhythmAnalyzer || this._compositeEngine) {
      prompt += '\n--- 实时数据上下文 ---\n';
      prompt += '以下是主人当前的行为数据，你可以根据这些数据回答主人的问题：\n';

      if (this._rhythmAnalyzer) {
        const signals = this._rhythmAnalyzer.getCurrentSignals?.() || {};
        const state = this._rhythmAnalyzer.currentState || 'idle';
        const stateNames = {
          flow: '心流状态', stuck: '卡壳状态', reading: '阅读思考',
          chatting: '沟通模式', typing: '打字中', away: '离开', idle: '空闲'
        };
        prompt += `- 当前状态: ${stateNames[state] || state}\n`;
        prompt += `- 打字速度: ${Math.round(signals.avgCPM || 0)} CPM (字符/分钟)\n`;
        prompt += `- 退格率: ${Math.round((signals.deleteRate || 0) * 100)}%\n`;
        prompt += `- 鼠标: ${signals.mouseActive ? '活跃' : '静止'}\n`;
      }

      if (this._compositeEngine) {
        const fullData = this._compositeEngine.getTodayFullData?.() || {};
        prompt += `- 今日打字时长: ${Math.round(fullData.totalTypingMin || 0)} 分钟\n`;
        prompt += `- 今日心流时长: ${Math.round(fullData.totalFlowMin || 0)} 分钟\n`;
        prompt += `- 今日按键数: ${this._compositeEngine.todayTypingCount || 0}\n`;
      }

      prompt += '你现在可以在回答中引用这些具体数据来回应主人的提问。\n';
    }

    // Inject pending todos
    if (this._todoList) {
      const todos = this._todoList._todos || [];
      const pending = todos.filter(t => !t.completed);
      if (pending.length > 0) {
        prompt += '\n--- 主人的待办事项 ---\n';
        for (const t of pending) {
          const pLabel = { high: '🔴高', medium: '🟡中', low: '🟢低' }[t.priority] || '中';
          let line = `- [${pLabel}] ${t.text}`;
          if (t.dueAt) {
            line += ` (截止: ${new Date(t.dueAt).toLocaleString('zh-CN')})`;
          }
          prompt += line + '\n';
        }
        prompt += `共 ${pending.length} 项未完成待办。你可以在回答中引用这些待办信息。\n`;
      }
    }

    return prompt;
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
          systemPrompt: this._buildSystemPrompt(),
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

        // V1.1: Detect sentiment from response
        this.lastFullResponse = fullResponse;
        this.lastSentiment = detectSentiment(fullResponse);

        // V1.1: Fire-and-forget memory extraction
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
