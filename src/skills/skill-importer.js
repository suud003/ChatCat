/**
 * Skill Importer — Import external SKILL.md files or ZIP skill packs.
 *
 * Runs in main process (CommonJS).
 * Supports:
 *   1. Single SKILL.md file — directly placed into skills directory
 *   2. ZIP skill pack — extracted into skills directory (contains SKILL.md + optional assets)
 */

const fs = require('fs');
const path = require('path');
const { SceneRegistry } = require('../ai-runtime/scene-registry');
const { PromptRegistry } = require('../ai-runtime/prompt-registry');

const { BrowserWindow } = require('electron');

class SkillImporter {
  /**
   * @param {string} skillsDir - Path to src/skills/skills/
   * @param {import('./skill-registry').SkillRegistry} skillRegistry
   */
  constructor(skillsDir, skillRegistry) {
    this._skillsDir = skillsDir;
    this._registry = skillRegistry;
  }

  /** Notify all windows that skills have changed */
  _notifySkillsChanged() {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('skills-changed');
      }
    }
  }

  /**
   * Import a skill from raw SKILL.md content.
   * @param {string} name - Skill directory name
   * @param {string} content - SKILL.md file content
   * @returns {Promise<{success: boolean, skillId?: string, reason?: string}>}
   */
  async importFromContent(name, content) {
    // 1. Validate frontmatter format
    const validation = this._validate(content);
    if (!validation.valid) {
      return { success: false, reason: validation.error };
    }

    // 2. Sanitize name
    name = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff_-]/g, '-').replace(/-+/g, '-');

    // 3. Create directory
    const dir = path.join(this._skillsDir, name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 4. Write SKILL.md
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');

    // 5. Hot-reload into registry
    try {
      await this._registry.loadSingle(name);
      this._registerRuntime(name);
    } catch (err) {
      console.error('[SkillImporter] Hot-load failed:', err.message);
    }

    console.log(`[SkillImporter] Imported skill: ${name}`);
    this._notifySkillsChanged();
    return { success: true, skillId: name };
  }

  /**
   * Import from a file path (.md or .zip).
   * @param {string} filePath
   * @returns {Promise<{success: boolean, skillId?: string, reason?: string}>}
   */
  async importFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.md') {
      const content = fs.readFileSync(filePath, 'utf8');
      const name = path.basename(filePath, '.md').toLowerCase().replace(/\s+/g, '-');
      return this.importFromContent(name, content);
    }

    if (ext === '.zip') {
      return this._importZip(filePath);
    }

    return { success: false, reason: `不支持的文件类型: ${ext}` };
  }

  /**
   * Validate SKILL.md frontmatter structure.
   */
  _validate(content) {
    if (!content.startsWith('---')) {
      return { valid: false, error: '缺少 YAML frontmatter (---)' };
    }
    const endIdx = content.indexOf('---', 3);
    if (endIdx === -1) {
      return { valid: false, error: 'frontmatter 未闭合' };
    }

    const yaml = content.slice(3, endIdx).trim();
    if (!yaml.includes('name:')) {
      return { valid: false, error: '缺少 name 字段' };
    }
    if (!yaml.includes('description:')) {
      return { valid: false, error: '缺少 description 字段' };
    }

    // Prompt body must not be empty
    const body = content.slice(endIdx + 3).trim();
    if (!body) {
      return { valid: false, error: '技能 prompt 正文为空' };
    }

    return { valid: true };
  }

  /**
   * Import from ZIP file.
   * Extracts to temp directory, locates SKILL.md, copies to skills dir.
   */
  async _importZip(zipPath) {
    // Use Node.js built-in zlib for simple cases, or gracefully degrade
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      // Find SKILL.md in the zip
      const skillEntry = entries.find(e => e.entryName.endsWith('SKILL.md'));
      if (!skillEntry) {
        return { success: false, reason: 'ZIP 中未找到 SKILL.md 文件' };
      }

      const content = skillEntry.getData().toString('utf8');
      const validation = this._validate(content);
      if (!validation.valid) {
        return { success: false, reason: validation.error };
      }

      // Determine skill name from directory or filename
      const dirName = path.dirname(skillEntry.entryName).split('/').pop() ||
        path.basename(zipPath, '.zip').toLowerCase().replace(/\s+/g, '-');
      const name = dirName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff_-]/g, '-');

      // Extract all files to skills directory
      const targetDir = path.join(this._skillsDir, name);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Extract entries preserving relative structure
      const baseDir = path.dirname(skillEntry.entryName);
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const relativePath = baseDir ? entry.entryName.replace(baseDir + '/', '') : entry.entryName;
        const targetPath = path.join(targetDir, relativePath);
        const targetFileDir = path.dirname(targetPath);
        if (!fs.existsSync(targetFileDir)) {
          fs.mkdirSync(targetFileDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, entry.getData());
      }

      // Hot-reload
      await this._registry.loadSingle(name);
      this._registerRuntime(name);
      console.log(`[SkillImporter] Imported ZIP skill: ${name}`);
      this._notifySkillsChanged();
      return { success: true, skillId: name };
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        return { success: false, reason: 'ZIP 导入需要 adm-zip 依赖，请运行 npm install adm-zip' };
      }
      return { success: false, reason: `ZIP 导入失败: ${err.message}` };
    }
  }

  /**
   * Register a hot-loaded skill into PromptRegistry and SceneRegistry
   * so AIRuntime can actually execute it.
   */
  _registerRuntime(name) {
    const meta = this._registry.get(name);
    if (!meta) return;

    const templateId = `skill.${meta.name}`;
    const sceneId = `skill.${meta.name}`;

    // Register prompt (lazy resolver reads SKILL.md body on demand)
    if (!PromptRegistry.hasPrompt(templateId)) {
      const registry = this._registry;
      PromptRegistry.register({
        templateId,
        version: '1.0.0',
        source: 'adapter:skill-importer',
        resolver: () => {
          const body = registry.readSkillBody(meta.name);
          return { system: body || '', userTemplate: null };
        },
      });
      console.log(`[SkillImporter] Registered prompt: ${templateId}`);
    }

    // Register scene
    if (!SceneRegistry.hasScene(sceneId)) {
      // Map SKILL.md context keys to context provider IDs
      const contextMap = {
        rawTyping: 'raw-typing',
        convertedText: 'converted-text',
        todos: 'todo',
        pomodoroStats: 'pomodoro',
      };
      const contextProviders = (meta.context || [])
        .map(k => contextMap[k] || k)
        .filter(Boolean);

      SceneRegistry.register({
        id: sceneId,
        category: 'skill',
        description: meta.description || `Imported skill: ${meta.name}`,
        prompt: { templateId, mode: 'instruction' },
        contextProviders,
        modelProfile: 'skill-complete',
        outputMode: 'markdown',
        memoryPolicy: 'none',
        postProcessors: [],
      });
      console.log(`[SkillImporter] Registered scene: ${sceneId}`);
    }
  }

  /**
   * List imported (non-built-in) skills.
   */
  getImported() {
    const builtIn = ['text-converter', 'todo-management', 'daily-report', 'ui-style-guide', '周报生成', 'weekly-report'];
    return this._registry.getAllMeta()
      .filter(s => !builtIn.includes(s.name))
      .map(s => ({ id: s.name, name: s.name, description: s.description }));
  }

  /**
   * Remove an imported skill.
   */
  async remove(name) {
    const dir = path.join(this._skillsDir, name);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
      this._registry.unregister(name);
      console.log(`[SkillImporter] Removed skill: ${name}`);
      this._notifySkillsChanged();
      return { success: true };
    }
    return { success: false, reason: '技能不存在' };
  }
}

module.exports = { SkillImporter };
