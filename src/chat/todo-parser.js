/**
 * Todo Parser
 *
 * Detects todo-like intent in chat messages using regex pre-check,
 * then uses AI API extraction to determine if it's a real todo.
 *
 * V3: Improved Layer 3 — local fallback only fires for explicit
 *     creation phrases (提醒我/别忘了/帮我记 etc.), NOT for vague
 *     mentions of "待办" or "todo". AI decision is authoritative:
 *     if AI says hasTodo=false, we trust it and skip.
 *
 * Detection flow:
 *   1. Regex pre-check — does message contain todo-related keywords?
 *   2. AI extraction — ask Main process to judge intent + extract details
 *   3. Local fallback — ONLY if AI call fails (network error etc.)
 *      AND message starts with an explicit creation verb
 */

// ─── Detection patterns (broad, used for pre-check only) ────────────────

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

// ─── Explicit creation verbs (narrow, used for fallback gate) ────────────
// Only these patterns indicate the user is *creating* a todo, not just
// mentioning the concept. Used to gate the local fallback.

const EXPLICIT_CREATE_PATTERNS = [
  /^提醒我/,
  /^别忘了/,
  /^帮我记/,
  /^要记得/,
  /^记得.{4,}/,      // "记得" only if followed by ≥4 chars of actual content
  /^添加.*任务/,
  /^添加.*待办/,
  /^todo\s*:\s*.+/i,  // "todo: something"
  /^remind\s+me\s+to\s+/i,
  /^don'?t\s+forget\s+to\s+/i,
  /^remember\s+to\s+/i,
];

// ─── Strip patterns (remove trigger prefix to get task text) ─────────────

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

export class TodoParser {
  /**
   * @param {*} todoList
   * @param {Function} showBubbleFn
   */
  constructor(todoList, showBubbleFn) {
    this._todoList = todoList;
    this._showBubble = showBubbleFn;
  }

  /**
   * Try to parse a todo from a conversation turn.
   *
   * Flow:
   *   1. Regex pre-check — exit early if no todo keywords
   *   2. AI extraction — authoritative judgment
   *      - hasTodo=true  → add todo (with priority/dueAt)
   *      - hasTodo=false → **trust AI, do NOT add**
   *   3. Local fallback — ONLY if AI call threw an error (network/timeout)
   *      AND message starts with an explicit creation verb
   */
  async tryParse(userMsg, assistantResp) {
    if (!userMsg || userMsg.length < 4) return;

    // Step 1: Broad regex pre-check
    const hasPattern = TODO_PATTERNS.some(p => p.test(userMsg));
    if (!hasPattern) return;

    console.log('[TodoParser] Pattern matched, attempting extraction for:', userMsg);

    // Step 2: AI extraction — authoritative
    let aiCalled = false;
    let aiError = false;

    try {
      const result = await window.electronAPI.todoParseText(userMsg);
      aiCalled = true;

      if (result && result.hasTodo && result.text) {
        // AI says this IS a todo → add it
        const dueAt = result.dueAt ? new Date(result.dueAt).getTime() : null;
        const priority = ['high', 'medium', 'low'].includes(result.priority) ? result.priority : 'medium';

        this._todoList.addTodo(result.text, priority, dueAt);

        if (this._showBubble) {
          this._showBubble(`📝 已添加待办: ${result.text}`, 4000);
        }
        console.log('[TodoParser] AI extraction succeeded:', result.text);
        return;
      }

      // AI says this is NOT a todo → trust it, exit
      console.log('[TodoParser] AI determined no todo in message, skipping');
      return;

    } catch (e) {
      console.warn('[TodoParser] AI extraction call failed:', e.message);
      aiError = true;
    }

    // Step 3: Local fallback — ONLY if AI call failed (not if AI said "no todo")
    if (!aiError) return;

    // Gate: only fallback for explicit creation phrases
    const trimmed = userMsg.trim();
    const isExplicitCreate = EXPLICIT_CREATE_PATTERNS.some(p => p.test(trimmed));

    if (!isExplicitCreate) {
      console.log('[TodoParser] AI unavailable + not an explicit create phrase, skipping');
      return;
    }

    console.log('[TodoParser] AI unavailable, using local fallback for explicit create');
    this._localExtract(userMsg);
  }

  /**
   * Local regex-based extraction (no API needed).
   * Only called when AI is unavailable AND message matches explicit create pattern.
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
}
