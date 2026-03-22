/**
 * MCP Config Importer — Import MCP server configurations and auto-register as skill proxies.
 *
 * Converts MCP server configs (e.g. from Claude Desktop's claude_desktop_config.json)
 * into ChatCat skills via SKILL.md generation.
 *
 * Runs in main process (CommonJS).
 */

const fs = require('fs');
const path = require('path');

class McpConfigImporter {
  /**
   * @param {import('electron-store')} store
   * @param {import('./skill-importer').SkillImporter} skillImporter
   */
  constructor(store, skillImporter) {
    this._store = store;
    this._skillImporter = skillImporter;
  }

  /**
   * Import from a Claude Desktop config file path.
   * @param {string} configPath - Path to claude_desktop_config.json
   * @returns {Promise<{success: boolean, imported: Array}>}
   */
  async importFromClaudeConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      const mcpServers = config.mcpServers || {};

      const results = [];
      for (const [name, serverConfig] of Object.entries(mcpServers)) {
        const result = await this._importMcpServer(name, serverConfig);
        results.push(result);
      }

      console.log(`[McpConfigImporter] Imported ${results.length} MCP servers from config`);
      return { success: true, imported: results };
    } catch (err) {
      console.error('[McpConfigImporter] Import failed:', err.message);
      return { success: false, imported: [], reason: err.message };
    }
  }

  /**
   * Import from a JSON object or string.
   * @param {string|Object} jsonContent
   * @returns {Promise<{success: boolean, imported?: Array, name?: string, status?: string}>}
   */
  async importFromJson(jsonContent) {
    try {
      const config = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

      // If it has mcpServers key, treat as Claude Desktop config
      if (config.mcpServers) {
        const results = [];
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          const result = await this._importMcpServer(name, serverConfig);
          results.push(result);
        }
        return { success: true, imported: results };
      }

      // Single server config
      const name = config.name || 'mcp-tool';
      const result = await this._importMcpServer(name, config);
      return { success: true, imported: [result] };
    } catch (err) {
      console.error('[McpConfigImporter] JSON import failed:', err.message);
      return { success: false, imported: [], reason: err.message };
    }
  }

  /**
   * Import a single MCP server configuration.
   */
  async _importMcpServer(name, serverConfig) {
    // Store MCP config
    const mcpConfigs = this._store.get('mcpServers') || {};
    mcpConfigs[name] = {
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: serverConfig.env || {},
      enabled: true,
      importedAt: Date.now(),
    };
    this._store.set('mcpServers', mcpConfigs);

    // Generate proxy SKILL.md
    const skillContent = this._generateMcpSkill(name, serverConfig);
    await this._skillImporter.importFromContent(`mcp-${name}`, skillContent);

    return { name, status: 'imported' };
  }

  /**
   * Generate a SKILL.md that acts as an MCP tool proxy.
   */
  _generateMcpSkill(name, config) {
    return `---
name: mcp-${name}
description: MCP 工具 — ${name} (自动导入)
commands: ["/mcp-${name}"]
keywords: ["${name}"]
context: []
requiresAI: true
temperature: 0.3
maxTokens: 2000
---

你是一个工具调用助手。用户请求使用 MCP 工具「${name}」。
当前配置：command=${config.command || 'unknown'}, args=${(config.args || []).join(' ')}

根据用户的请求，生成合适的工具调用参数，并解释工具的用途。
如果用户没有明确指定参数，请询问需要的信息。
`;
  }

  /**
   * Get all imported MCP configurations.
   */
  getImported() {
    const mcpConfigs = this._store.get('mcpServers') || {};
    return Object.entries(mcpConfigs).map(([name, config]) => ({
      name,
      command: config.command,
      enabled: config.enabled,
      importedAt: config.importedAt,
    }));
  }

  /**
   * Remove an MCP configuration and its proxy skill.
   */
  async remove(name) {
    const mcpConfigs = this._store.get('mcpServers') || {};
    delete mcpConfigs[name];
    this._store.set('mcpServers', mcpConfigs);
    await this._skillImporter.remove(`mcp-${name}`);
    console.log(`[McpConfigImporter] Removed MCP: ${name}`);
    return { success: true };
  }
}

module.exports = { McpConfigImporter };
