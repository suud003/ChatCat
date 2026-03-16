/**
 * Skill Router — Renderer-side command/keyword routing.
 *
 * Intercepts chat input, matches skills by:
 * Tier 1: /command exact match (0 token)
 * Tier 2: keyword regex match (0 token)
 *
 * Unmatched input falls through to normal AI chat.
 */

export class SkillRouter {
  constructor() {
    this._metas = [];
    this._initialized = false;
  }

  /**
   * Initialize by fetching all skill metadata from main process.
   */
  async init() {
    try {
      this._metas = await window.electronAPI.skillGetAllMeta();
      this._initialized = true;
      console.log(`[SkillRouter] Loaded ${this._metas.length} skill definitions`);
    } catch (err) {
      console.warn('[SkillRouter] Failed to load skill metas:', err);
      this._metas = [];
    }
  }

  /**
   * Match user input to a skill (without executing).
   * @param {string} text - Raw user input
   * @returns {object|false} skill meta or false if no match
   */
  async match(text) {
    if (!this._initialized || !text) return false;

    const trimmed = text.trim();

    // Tier 1: /command exact match
    if (trimmed.startsWith('/')) {
      const cmd = trimmed.split(/\s+/)[0].toLowerCase();
      const meta = this._metas.find(m =>
        m.commands && m.commands.some(c => c.toLowerCase() === cmd)
      );
      if (meta) return meta;
    }

    // Tier 2: keyword regex match
    for (const meta of this._metas) {
      if (!meta.keywords || meta.keywords.length === 0) continue;
      const matched = meta.keywords.some(kw => {
        try {
          return new RegExp(kw, 'i').test(trimmed);
        } catch {
          return trimmed.toLowerCase().includes(kw.toLowerCase());
        }
      });
      if (matched) return meta;
    }

    return false;
  }

  /**
   * Execute a skill via IPC.
   * @returns {{ skillId: string, result: object }}
   */
  async execute(skillId, userMessage) {
    try {
      const result = await window.electronAPI.skillExecute(skillId, { userMessage });
      return { skillId, result };
    } catch (err) {
      return {
        skillId,
        result: { success: false, output: `执行错误: ${err.message}`, outputType: 'text' }
      };
    }
  }

  /**
   * Get all skill metadata for display.
   */
  getAllMeta() {
    return this._metas;
  }
}
