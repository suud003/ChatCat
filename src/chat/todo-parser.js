/**
 * Todo Parser
 *
 * Detects todo-like intent in chat messages using regex pre-check,
 * then tries AI API extraction; falls back to regex-based local extraction.
 */

// Regex patterns that suggest todo intent
const TODO_PATTERNS = [
  /提醒我/,
  /记得/,
  /别忘了/,
  /待办/,
  /todo/i,
  /remind\s+me/i,
  /don'?t\s+forget/i,
  /remember\s+to/i,
  /要记得/,
  /帮我记/,
  /添加.*任务/,
];

// Local extraction: strip the trigger keyword to get the task text
const STRIP_PATTERNS = [
  /^提醒我\s*/,
  /^记得\s*/,
  /^别忘了\s*/,
  /^帮我记一下?\s*/,
  /^帮我记住?\s*/,
  /^要记得\s*/,
  /^添加任务\s*/,
  /^添加.*待办\s*/,
  /^remind\s+me\s+(to\s+)?/i,
  /^don'?t\s+forget\s+(to\s+)?/i,
  /^remember\s+to\s+/i,
  /^todo\s*:?\s*/i,
];

const EXTRACT_PROMPT = `You are a todo extraction assistant. Given a user message, determine if it contains a task/reminder/todo item.

Rules:
- If there IS a todo, respond with JSON: {"hasTodo": true, "text": "task description", "priority": "high|medium|low", "dueAt": "ISO string or null"}
- If there is NO todo, respond with: {"hasTodo": false}
- For due times, interpret relative references (e.g., "tomorrow 3pm", "next Monday")
- Current time reference: {currentTime}
- Priority: default to "medium", use "high" for urgent language, "low" for casual mentions
- Respond with ONLY the JSON object, no other text`;

export class TodoParser {
  constructor(aiService, todoList, showBubbleFn) {
    this._aiService = aiService;
    this._todoList = todoList;
    this._showBubble = showBubbleFn;
  }

  /**
   * Try to parse a todo from a conversation turn.
   * Two-step: regex pre-check, then API extraction (with local fallback).
   */
  async tryParse(userMsg, assistantResp) {
    if (!userMsg || userMsg.length < 4) return;

    // Step 1: regex pre-check
    const hasPattern = TODO_PATTERNS.some(p => p.test(userMsg));
    if (!hasPattern) return;

    console.log('[TodoParser] Pattern matched, attempting extraction for:', userMsg);

    // Step 2: Try API extraction, fall back to local
    let added = false;

    if (this._aiService && this._aiService.isConfigured()) {
      added = await this._tryApiExtract(userMsg);
    }

    if (!added) {
      console.log('[TodoParser] API extraction failed or unavailable, using local fallback');
      this._localExtract(userMsg);
    }
  }

  /**
   * Local regex-based extraction (no API needed).
   */
  _localExtract(userMsg) {
    let text = userMsg.trim();

    // Strip trigger keyword prefix
    for (const p of STRIP_PATTERNS) {
      if (p.test(text)) {
        text = text.replace(p, '').trim();
        break;
      }
    }

    if (!text || text.length < 2) {
      text = userMsg.trim(); // fall back to full message
    }

    this._todoList.addTodo(text, 'medium', null);

    if (this._showBubble) {
      this._showBubble(`📝 已添加待办: ${text}`, 4000);
    }
  }

  /**
   * API-based extraction for structured data (priority, due time).
   * Returns true if successfully added a todo.
   */
  async _tryApiExtract(userMsg) {
    try {
      const now = new Date();
      const currentTime = now.toISOString();
      const prompt = EXTRACT_PROMPT.replace('{currentTime}', currentTime);

      const messages = [
        { role: 'system', content: prompt },
        { role: 'user', content: userMsg },
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
          max_tokens: 150,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        console.warn('[TodoParser] API response not ok:', response.status);
        return false;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return false;

      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const result = JSON.parse(jsonStr);
      if (!result.hasTodo || !result.text) return false;

      const dueAt = result.dueAt ? new Date(result.dueAt).getTime() : null;
      const priority = ['high', 'medium', 'low'].includes(result.priority) ? result.priority : 'medium';

      this._todoList.addTodo(result.text, priority, dueAt);

      if (this._showBubble) {
        this._showBubble(`📝 已添加待办: ${result.text}`, 4000);
      }
      return true;
    } catch (e) {
      console.warn('[TodoParser] API extraction failed:', e.message);
      return false;
    }
  }
}
