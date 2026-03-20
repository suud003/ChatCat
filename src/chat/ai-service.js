/**
 * AI Service - OpenAI-compatible API client with streaming support
 * V1.1: Dynamic system prompt via personality + memory integration, sentiment detection
 * V2: Refactored to use centralized AIClientRenderer for HTTP calls
 * V3: Phase 2 — chat streaming now delegates to AIRuntimeRenderer for unified
 *     model config management. Prompt building stays here.
 *
 * Scene: chat.default / chat.followup (AI Runtime SceneRegistry)
 * Model config sourced from AI Runtime ModelProfiles 'chat-stream' via AIRuntimeRenderer.
 * Prompt corresponds to AI Runtime PromptRegistry 'chat-system-prompt' (dynamic via personality.js).
 * Context providers: personality, history, memory, behavior.
 */

import { buildSystemPrompt, detectSentiment } from './personality.js';
import { AIClientRenderer } from '../shared/ai-client-renderer.js';
import { AIRuntimeRenderer } from '../ai-runtime/runtime-renderer.js';

// Model parameters — used as fallback when AIRuntimeRenderer is not available
// Canonical values are now in ModelProfiles 'chat-stream'.
const CHAT_FALLBACK_TEMPERATURE = 0.8;
const CHAT_FALLBACK_MAX_TOKENS = 500;

export class AIService {
  constructor() {
    this._client = new AIClientRenderer();
    this._runtime = null;  // AIRuntimeRenderer, set via setRuntime()
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
  }

  /**
   * Phase 2: Set AIRuntimeRenderer for centralized model config.
   * @param {import('../ai-runtime/runtime-renderer').AIRuntimeRenderer} runtime
   */
  setRuntime(runtime) {
    this._runtime = runtime;
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

  setPersonality(p) {
    this._personality = p || 'lively';
  }

  async loadConfig() {
    await this._client.loadConfig();

    const history = await window.electronAPI.getStore('chatHistory');
    if (Array.isArray(history)) {
      this.conversationHistory = history.slice(-20); // Keep last 20 messages
    }
  }

  isConfigured() {
    return this._client.isConfigured();
  }

  /** Expose underlying client for modules that need direct access (e.g. MemoryManager) */
  get client() {
    return this._client;
  }

  // Backward-compatible getters for external code that reads these directly
  get baseUrl() { return this._client.baseUrl; }
  get apiKey() { return this._client.apiKey; }
  get modelName() { return this._client.modelName; }

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

    return prompt;
  }

  async *sendMessageStream(userMessage) {
    if (!this.isConfigured()) {
      yield 'Please configure your API key in Settings first! (=^.^=)';
      return;
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    try {
      let fullResponse = '';

      // Phase 2: Delegate to AIRuntimeRenderer if available
      if (this._runtime && this._runtime.isReady()) {
        const trigger = AIRuntimeRenderer.createTrigger('chat', 'chat.default', {
          systemPrompt: this._buildSystemPrompt(),
          history: this.conversationHistory,
        });

        for await (const chunk of this._runtime.runStream(trigger)) {
          fullResponse += chunk;
          yield chunk;
        }
      } else {
        // Fallback: direct client call (pre-Phase 2 behavior)
        const messages = [
          { role: 'system', content: this._buildSystemPrompt() },
          ...this.conversationHistory
        ];

        for await (const chunk of this._client.stream({
          messages,
          temperature: CHAT_FALLBACK_TEMPERATURE,
          maxTokens: CHAT_FALLBACK_MAX_TOKENS,
        })) {
          fullResponse += chunk;
          yield chunk;
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
   * Test API Connection with given credentials
   */
  async testConnection(apiUrl, apiKey, modelName, options = {}) {
    return this._client.testConnection(apiUrl, apiKey, modelName, options);
  }
}
