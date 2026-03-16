/**
 * Skill Registry — Scans skills/ directory, parses SKILL.md frontmatter, caches metadata.
 *
 * Runs in main process (requires fs).
 * Frontmatter parsed via simple YAML parser (no dependency).
 */

const fs = require('fs');
const path = require('path');

class SkillRegistry {
  constructor(skillsDir) {
    this._skills = new Map();
    this._dir = skillsDir;
  }

  /**
   * Initialize: scan skills directory and parse all SKILL.md frontmatter.
   */
  async init() {
    if (!fs.existsSync(this._dir)) {
      console.warn('[SkillRegistry] Skills directory not found:', this._dir);
      return;
    }

    const entries = fs.readdirSync(this._dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = path.join(this._dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const meta = this._parseFrontmatter(content, entry.name);
        if (meta) {
          meta._path = skillMdPath;
          this._skills.set(meta.name, meta);
        }
      } catch (err) {
        console.warn(`[SkillRegistry] Failed to parse ${skillMdPath}:`, err.message);
      }
    }

    console.log(`[SkillRegistry] Loaded ${this._skills.size} skills:`,
      [...this._skills.keys()].join(', '));
  }

  /**
   * Parse YAML frontmatter from SKILL.md content.
   * Simple parser — no external dependency needed.
   */
  _parseFrontmatter(content, dirName) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const meta = {
      name: dirName,
      description: '',
      commands: [],
      keywords: [],
      schedule: null,
      context: [],
      requiresAI: true,
      localHandler: null,
      maxTokens: 2000,
      temperature: 0.7
    };

    for (const line of yaml.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle nested keys (schedule.cronHour)
      if (trimmed.startsWith('cronHour:')) {
        if (!meta.schedule) meta.schedule = {};
        meta.schedule.cronHour = parseInt(trimmed.split(':')[1].trim());
        continue;
      }
      if (trimmed.startsWith('interval:')) {
        if (!meta.schedule) meta.schedule = {};
        meta.schedule.interval = parseInt(trimmed.split(':')[1].trim());
        continue;
      }

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.substring(0, colonIdx).trim();
      let value = trimmed.substring(colonIdx + 1).trim();

      switch (key) {
        case 'name':
          meta.name = value;
          break;
        case 'description':
          meta.description = value;
          break;
        case 'commands':
          meta.commands = this._parseYamlArray(value);
          break;
        case 'keywords':
          meta.keywords = this._parseYamlArray(value);
          break;
        case 'context':
          meta.context = this._parseYamlArray(value);
          break;
        case 'requiresAI':
          meta.requiresAI = value === 'true';
          break;
        case 'localHandler':
          meta.localHandler = value;
          break;
        case 'maxTokens':
          meta.maxTokens = parseInt(value) || 2000;
          break;
        case 'temperature':
          meta.temperature = parseFloat(value) || 0.7;
          break;
        case 'schedule':
          // schedule block header — children handle the rest
          if (!meta.schedule) meta.schedule = {};
          break;
      }
    }

    return meta;
  }

  /**
   * Parse a YAML inline array like ["/report", "/日报"]
   */
  _parseYamlArray(str) {
    str = str.trim();
    if (str.startsWith('[') && str.endsWith(']')) {
      const inner = str.slice(1, -1);
      return inner.split(',').map(s => {
        s = s.trim();
        // Remove surrounding quotes
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1);
        }
        return s;
      }).filter(Boolean);
    }
    return [];
  }

  // --- Public API ---

  /**
   * Find skill by exact slash command.
   * @returns {object|null} skill metadata
   */
  findByCommand(cmd) {
    cmd = cmd.toLowerCase();
    for (const meta of this._skills.values()) {
      if (meta.commands.some(c => c.toLowerCase() === cmd)) {
        return meta;
      }
    }
    return null;
  }

  /**
   * Find skills matching keywords in text.
   * @returns {object[]} matching skill metadata list
   */
  findByKeywords(text) {
    const results = [];
    for (const meta of this._skills.values()) {
      if (meta.keywords.some(kw => new RegExp(kw, 'i').test(text))) {
        results.push(meta);
      }
    }
    return results;
  }

  /**
   * Get all skills with schedule config.
   * @returns {object[]} skill metadata with schedule
   */
  getScheduled() {
    return [...this._skills.values()].filter(m => m.schedule);
  }

  /**
   * Get metadata for a specific skill.
   * @returns {object|null}
   */
  get(skillId) {
    return this._skills.get(skillId) || null;
  }

  /**
   * Get all skill metadata (serializable, no internal paths).
   * For IPC transfer to renderer.
   */
  getAllMeta() {
    return [...this._skills.values()].map(m => ({
      name: m.name,
      description: m.description,
      commands: m.commands,
      keywords: m.keywords,
      schedule: m.schedule,
      context: m.context,
      requiresAI: m.requiresAI,
      localHandler: m.localHandler,
      maxTokens: m.maxTokens,
      temperature: m.temperature
    }));
  }

  /**
   * Lazily read the body of a SKILL.md (everything after frontmatter).
   * @returns {string} prompt body
   */
  readSkillBody(skillId) {
    const meta = this._skills.get(skillId);
    if (!meta || !meta._path) return '';

    const content = fs.readFileSync(meta._path, 'utf-8');
    const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)/);
    return match ? match[1].trim() : '';
  }
}

module.exports = { SkillRegistry };
