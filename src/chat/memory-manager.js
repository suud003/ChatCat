/**
 * AI Long-term Memory Manager
 *
 * Extracts key facts from conversations via API,
 * stores up to 30 memories, and provides them for prompt injection.
 */

const MAX_MEMORIES = 30;
const CATEGORIES = ['name', 'preference', 'habit', 'birthday', 'work', 'other'];

const EXTRACT_SYSTEM_PROMPT = `You are a memory extraction assistant. Given a user message and assistant response from a chat, extract key personal facts about the user.

Rules:
- Only extract concrete, memorable facts (name, preferences, habits, birthday, work info, etc.)
- Return a JSON array of objects: [{"fact": "...", "category": "..."}]
- Categories: name, preference, habit, birthday, work, other
- If no memorable facts, return an empty array: []
- Keep facts short (under 50 chars each)
- Max 3 facts per extraction
- Do NOT extract generic conversational content
- Respond with ONLY the JSON array, no other text`;

export class MemoryManager {
  constructor() {
    this._memories = []; // { id, fact, category, timestamp }
    this._nextId = 1;
    this._aiService = null;
  }

  setAIService(aiService) {
    this._aiService = aiService;
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
    if (!this._aiService || !this._aiService.isConfigured()) return;

    try {
      const messages = [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        { role: 'user', content: `User message: "${userMsg}"\nAssistant response: "${assistantResp}"` },
      ];

      const response = await fetch(`${this._aiService.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._aiService.apiKey}`,
        },
        body: JSON.stringify({
          model: this._aiService.modelName,
          messages,
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
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
