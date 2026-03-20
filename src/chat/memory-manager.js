/**
 * AI Long-term Memory Manager
 *
 * Extracts key facts from conversations via API,
 * stores up to 30 memories, and provides them for prompt injection.
 *
 * V3: Phase 2 — extraction now delegates to AIRuntimeRenderer.
 *     Prompt and model config sourced from PromptRegistry/ModelProfiles
 *     via the runtime's IPC registry mirror.
 *
 * Scene: memory.extract (AI Runtime SceneRegistry)
 * Model config: ModelProfiles 'memory-extract' (via AIRuntimeRenderer)
 * Prompt: PromptRegistry 'memory-extract' (via AIRuntimeRenderer)
 */

import { AIRuntimeRenderer } from '../ai-runtime/runtime-renderer.js';

const MAX_MEMORIES = 30;
const CATEGORIES = ['name', 'preference', 'habit', 'birthday', 'work', 'other'];

export class MemoryManager {
  /**
   * @param {AIRuntimeRenderer} [aiRuntimeRenderer] - Phase 2 runtime
   */
  constructor(aiRuntimeRenderer) {
    this._memories = []; // { id, fact, category, timestamp }
    this._nextId = 1;
    this._runtime = aiRuntimeRenderer || null;
  }

  async init() {
    const saved = await window.electronAPI.getStore('aiMemories');
    if (Array.isArray(saved) && saved.length > 0) {
      this._memories = saved;
      this._nextId = this._memories.reduce((max, m) => Math.max(max, (m.id || 0) + 1), 1);
    }
  }

  /**
   * Extract memories from a conversation turn (fire-and-forget).
   * Only triggers when user message is > 10 characters.
   */
  async extractMemories(userMsg, assistantResp) {
    if (!userMsg || userMsg.length <= 10) return;
    if (!this._runtime || !this._runtime.isReady()) return;

    try {
      const trigger = AIRuntimeRenderer.createTrigger('memory', 'memory.extract', {
        userMessage: userMsg,
        assistantResponse: assistantResp,
      });

      const content = await this._runtime.run(trigger);

      if (!content) return;

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const facts = JSON.parse(jsonStr);
      if (!Array.isArray(facts)) return;

      for (const item of facts) {
        if (!item.fact || typeof item.fact !== 'string') continue;
        const category = CATEGORIES.includes(item.category) ? item.category : 'other';

        // Avoid duplicate facts
        const isDuplicate = this._memories.some(
          m => m.fact.toLowerCase() === item.fact.toLowerCase()
        );
        if (isDuplicate) continue;

        this._memories.push({
          id: this._nextId++,
          fact: item.fact.substring(0, 100),
          category,
          timestamp: Date.now(),
        });
      }

      // Enforce cap
      if (this._memories.length > MAX_MEMORIES) {
        this._memories = this._memories.slice(-MAX_MEMORIES);
      }

      await this._save();
    } catch (e) {
      console.warn('Memory extraction failed:', e.message);
    }
  }

  /**
   * Get top N memories for prompt injection (most recent first).
   */
  getTopMemories(n = 10) {
    return this._memories.slice(-n);
  }

  getAll() {
    return [...this._memories];
  }

  deleteMemory(id) {
    this._memories = this._memories.filter(m => m.id !== id);
    this._save();
  }

  clearAll() {
    this._memories = [];
    this._nextId = 1;
    this._save();
  }

  async _save() {
    await window.electronAPI.setStore('aiMemories', this._memories);
  }
}
