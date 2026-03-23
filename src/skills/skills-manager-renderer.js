// Skills Manager - Renderer Logic
(function () {
  const api = window.electronAPI;

  // DOM refs
  const skillsList = document.getElementById('skills-list');
  const mcpList = document.getElementById('mcp-list');
  const statusbar = document.getElementById('statusbar');
  const toastEl = document.getElementById('toast');

  // ─── Tab switching ───────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ─── Close button ────────────────────────────────────────────────────
  document.getElementById('btn-close').addEventListener('click', () => {
    api.closeWindow();
  });

  // ─── Toast helper ────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    toastEl.textContent = msg;
    toastEl.className = 'toast toast-' + type + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2500);
  }

  // ─── Render skills list ──────────────────────────────────────────────
  async function refreshSkills() {
    let allMeta = [];
    let imported = [];
    try {
      allMeta = await api.skillGetAllMeta();
      imported = await api.getImportedSkills();
    } catch (e) {
      console.error('[SkillsManager] Failed to load skills', e);
    }

    const importedIds = new Set(imported.map(s => s.id || s.name));

    if (allMeta.length === 0 && imported.length === 0) {
      skillsList.innerHTML = '<div class="list-empty">暂无技能</div>';
      updateStatus(0, 0);
      return;
    }

    let builtinCount = 0;
    let importedCount = importedIds.size;
    let html = '';

    // Built-in skills from allMeta that are NOT imported
    for (const skill of allMeta) {
      const isImported = importedIds.has(skill.id || skill.name);
      if (isImported) continue;
      builtinCount++;
      html += renderSkillItem(skill, false);
    }

    // Imported skills
    for (const skill of imported) {
      html += renderSkillItem(skill, true);
    }

    skillsList.innerHTML = html;
    updateStatus(builtinCount, importedCount);
    wireSkillDeleteButtons();
  }

  function renderSkillItem(skill, isImported) {
    const name = skill.name || skill.id || '未知';
    const desc = skill.description || '';
    const commands = skill.commands ? skill.commands.join(', ') : '';
    const badgeClass = isImported ? 'badge-imported' : 'badge-builtin';
    const badgeText = isImported ? '导入' : '内置';

    let actionsHtml = '';
    if (isImported) {
      actionsHtml = `<button class="btn-delete btn-delete-skill" data-name="${skill.id || skill.name}">删除</button>`;
    }

    return `
      <div class="list-item">
        <div class="item-info">
          <div class="item-name">
            <span>${name}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          ${desc ? `<div class="item-desc" title="${desc}">${desc}</div>` : ''}
          ${commands ? `<div class="item-meta">命令: ${commands}</div>` : ''}
        </div>
        <div class="item-actions">${actionsHtml}</div>
      </div>`;
  }

  function wireSkillDeleteButtons() {
    skillsList.querySelectorAll('.btn-delete-skill').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        try {
          await api.removeImportedSkill(name);
          showToast('已删除技能: ' + name);
          refreshSkills();
        } catch (e) {
          showToast('删除失败: ' + e.message, 'error');
        }
      });
    });
  }

  // ─── Render MCP list ─────────────────────────────────────────────────
  async function refreshMcp() {
    let mcps = [];
    try {
      mcps = await api.getImportedMcp();
    } catch (e) {
      console.error('[SkillsManager] Failed to load MCP', e);
    }

    if (mcps.length === 0) {
      mcpList.innerHTML = '<div class="list-empty">暂无 MCP 配置</div>';
      return;
    }

    let html = '';
    for (const m of mcps) {
      const name = m.name || '未知';
      const command = m.command || '';
      const args = m.args ? m.args.join(' ') : '';

      html += `
        <div class="list-item">
          <div class="item-info">
            <div class="item-name">
              <span>${name}</span>
              <span class="badge badge-imported">MCP</span>
            </div>
            ${command ? `<div class="item-desc" title="${command} ${args}">命令: ${command} ${args}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn-delete btn-delete-mcp" data-name="${name}">删除</button>
          </div>
        </div>`;
    }

    mcpList.innerHTML = html;
    wireMcpDeleteButtons();
  }

  function wireMcpDeleteButtons() {
    mcpList.querySelectorAll('.btn-delete-mcp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        try {
          await api.removeMcp(name);
          showToast('已删除 MCP: ' + name);
          refreshMcp();
        } catch (e) {
          showToast('删除失败: ' + e.message, 'error');
        }
      });
    });
  }

  // ─── Import buttons ──────────────────────────────────────────────────
  document.getElementById('btn-import-skill').addEventListener('click', async () => {
    try {
      const result = await api.dialogOpenFile({
        title: '导入技能文件',
        filters: [
          { name: '技能包', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (result.filePath) {
        const importResult = await api.importSkillFile(result.filePath);
        if (importResult.success) {
          showToast('技能导入成功');
          refreshSkills();
        } else {
          showToast('导入失败: ' + (importResult.reason || '未知错误'), 'error');
        }
      }
    } catch (e) {
      showToast('导入失败: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-import-mcp').addEventListener('click', async () => {
    try {
      const result = await api.dialogOpenFile({
        title: '导入 MCP 配置',
        filters: [
          { name: 'JSON 文件', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (result.filePath) {
        const importResult = await api.importMcpConfig(result.filePath);
        if (importResult.success) {
          showToast('MCP 配置导入成功');
          refreshMcp();
        } else {
          showToast('导入失败: ' + (importResult.reason || '未知错误'), 'error');
        }
      }
    } catch (e) {
      showToast('导入失败: ' + e.message, 'error');
    }
  });

  // ─── Status bar ──────────────────────────────────────────────────────
  function updateStatus(builtinCount, importedCount) {
    statusbar.textContent = `内置技能: ${builtinCount} 个  |  导入技能: ${importedCount} 个`;
  }

  // ─── Init ────────────────────────────────────────────────────────────
  refreshSkills();
  refreshMcp();
})();
