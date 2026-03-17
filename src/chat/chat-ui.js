/**
 * Chat UI - manga speech bubble with tabs (Chat / Settings), drag & maximize
 * V1.1: sentiment-based cat expressions, personality selector, memory management, todoParser hook
 */

import { PERSONALITIES } from './personality.js';

export class ChatUI {
  constructor(aiService, character, apiPresets) {
    this.aiService = aiService;
    this.character = character;
    this.apiPresets = apiPresets || {};
    this.isVisible = false;
    this.isStreaming = false;
    this.isMaximized = false;
    this.savedPosition = null;

    // V1.1: optional hooks
    this._todoParser = null;
    this._onSentiment = null;
    this._skillRouter = null;
    this._onSettingsSaved = null;

    this.container = document.getElementById('chat-container');
    this.bubbleEl = document.getElementById('chat-bubble');
    this.bodyEl = document.getElementById('chat-body');
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.closeBtn = document.getElementById('chat-close');
    this.maximizeBtn = document.getElementById('chat-maximize');
    this.headerEl = document.getElementById('chat-bubble-header');

    // Tab elements
    this.tabChat = document.getElementById('tab-chat');
    this.tabSettings = document.getElementById('tab-settings');
    this.tabButtons = this.headerEl.querySelectorAll('.panel-tab');

    // Settings elements
    this.presetSelect = document.getElementById('setting-preset');
    this.modelSelect = document.getElementById('setting-model');
    this.modelCustomInput = document.getElementById('setting-model-custom');
    this.apiUrlInput = document.getElementById('setting-api-url');
    this.urlGroup = document.getElementById('url-group');
    this.apiKeyInput = document.getElementById('setting-api-key');
    this.opacityInput = document.getElementById('setting-opacity');
    this.opacityValue = document.getElementById('opacity-value');

    // V1.1: personality selector
    this.personalitySelect = document.getElementById('setting-personality');

    this.positionFn = null; // set by renderer.js for dynamic positioning
    this._settingsSnapshot = null; // snapshot for dirty-check
    this._currentTab = 'chat';

    this.setupEvents();
    this.setupDrag();
    this.setupSettingsEvents();
  }

  /** Set a TodoParser instance for auto-parsing */
  setTodoParser(parser) {
    this._todoParser = parser;
  }

  /** Set a SkillRouter instance for command/keyword routing */
  setSkillRouter(router) {
    this._skillRouter = router;
  }

  /** Set callback for sentiment changes: (sentiment) => void */
  set onSentiment(fn) {
    this._onSentiment = fn;
  }

  /** Set callback for when settings are saved: () => void */
  set onSettingsSaved(fn) {
    this._onSettingsSaved = fn;
  }

  /** Allow ProactiveEngine to send a message into chat as the cat */
  showProactiveMessage(text) {
    if (!this.isVisible) {
      this.show();
    }
    this.switchTab('chat');
    this.addMessage(text, 'assistant');
  }

  setupEvents() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    this.maximizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize();
    });

    // Tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchTab(btn.dataset.tab);
      });
    });

    window.electronAPI.onToggleChat(() => this.toggle());
    window.electronAPI.onOpenSettings(() => {
      this.show();
      this.switchTab('settings');
    });
  }

  setupDrag() {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    this.headerEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn') || e.target.closest('.panel-tab')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      this.container.style.left = origLeft + 'px';
      this.container.style.top = origTop + 'px';
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      this.container.style.left = (origLeft + (e.clientX - startX)) + 'px';
      this.container.style.top = (origTop + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  setupSettingsEvents() {
    this.presetSelect.addEventListener('change', () => {
      this.populateModels(this.presetSelect.value, null, '');
    });

    this.opacityInput.addEventListener('input', () => {
      const val = parseFloat(this.opacityInput.value);
      this.opacityValue.textContent = Math.round(val * 100) + '%';
    });

    // V1.2: Proactive frequency slider
    const proactiveSlider = document.getElementById('proactive-max-daily');
    const proactiveFreqDisplay = document.getElementById('proactive-freq-value');
    if (proactiveSlider && proactiveFreqDisplay) {
      proactiveSlider.addEventListener('input', () => {
        proactiveFreqDisplay.textContent = proactiveSlider.value;
      });
    }

    document.getElementById('settings-save').addEventListener('click', async () => {
      const presetKey = this.presetSelect.value;
      const preset = this.apiPresets[presetKey];

      let selectedModel;
      let apiUrl;

      if (preset && !preset.needsUrl) {
        // Preset with fixed URL
        apiUrl = preset.url;
        selectedModel = (preset.models && preset.models.length > 0) ? this.modelSelect.value : this.modelCustomInput.value.trim();
      } else {
        // Custom or needsUrl (like openclaw)
        apiUrl = this.apiUrlInput.value.trim();
        selectedModel = this.modelCustomInput.value.trim();
      }

      await window.electronAPI.setStore('apiBaseUrl', apiUrl);
      await window.electronAPI.setStore('modelName', selectedModel);
      await window.electronAPI.setStore('apiKey', this.apiKeyInput.value);
      await window.electronAPI.setStore('opacity', parseFloat(this.opacityInput.value));
      await window.electronAPI.setStore('apiPreset', presetKey);

      // V1.1: Save personality
      if (this.personalitySelect) {
        const personality = this.personalitySelect.value;
        await window.electronAPI.setStore('catPersonality', personality);
        this.aiService.setPersonality(personality);
      }

      await this.aiService.loadConfig();

      // V1.2: Save skill settings
      const skillsEnabled = {
        textConverter: document.getElementById('skill-text-converter')?.checked !== false,
        dailyReport: document.getElementById('skill-daily-report')?.checked !== false,
        todoExtractor: document.getElementById('skill-todo-extractor')?.checked !== false
      };
      await window.electronAPI.setStore('skillsEnabled', skillsEnabled);

      const reportHour = parseInt(document.getElementById('skill-report-hour')?.value) || 18;
      await window.electronAPI.setStore('dailyReportHour', reportHour);

      const todoInterval = parseInt(document.getElementById('todo-remind-interval')?.value) || 30;
      await window.electronAPI.setStore('todoRemindInterval', todoInterval);

      // V1.2: Save proactive settings
      const proactiveConfig = {
        enabled: document.getElementById('proactive-enabled')?.checked !== false,
        maxDailyInteractions: parseInt(document.getElementById('proactive-max-daily')?.value) || 8,
        quietHours: {
          start: parseInt(document.getElementById('quiet-start')?.value) || 23,
          end: parseInt(document.getElementById('quiet-end')?.value) || 7
        },
        enabledSceneTypes: [
          ...(document.getElementById('scene-info')?.checked ? ['info'] : []),
          ...(document.getElementById('scene-care')?.checked ? ['care'] : []),
          ...(document.getElementById('scene-efficiency')?.checked ? ['efficiency'] : []),
          ...(document.getElementById('scene-chat')?.checked ? ['chat'] : [])
        ]
      };
      await window.electronAPI.setStore('proactiveConfig', proactiveConfig);

      // Notify proactive engine to reload config
      if (this._onSettingsSaved) this._onSettingsSaved();

      // Re-snapshot so dirty check is clean
      this._snapshotSettings();

      // Switch back to chat tab after save
      this.switchTab('chat');
    });

    // V1.1: Memory management buttons
    const memClearBtn = document.getElementById('memory-clear-btn');
    if (memClearBtn) {
      memClearBtn.addEventListener('click', () => {
        if (this.aiService._memoryManager) {
          this.aiService._memoryManager.clearAll();
          this._renderMemoryList();
        }
      });
    }

    // V1.5: Daily report output dir picker
    const reportDirBtn = document.getElementById('daily-report-dir-btn');
    const reportDirInput = document.getElementById('daily-report-dir');
    if (reportDirBtn && reportDirInput) {
      const pickDir = async () => {
        const result = await window.electronAPI.dailyReportSetDir();
        if (result.outputDir) {
          reportDirInput.value = result.outputDir;
        }
      };
      reportDirBtn.addEventListener('click', pickDir);
      reportDirInput.addEventListener('click', pickDir);
    }
  }

  populateModels(presetKey, savedModel, savedUrl) {
    const preset = this.apiPresets[presetKey];

    // Show/hide URL input: visible for custom and presets with needsUrl
    const needsUrl = !preset || (preset && preset.needsUrl);
    this.urlGroup.style.display = needsUrl ? '' : 'none';
    if (needsUrl && savedUrl) {
      this.apiUrlInput.value = savedUrl;
    } else if (!needsUrl) {
      this.apiUrlInput.value = preset ? preset.url : '';
    }

    if (preset && preset.models && preset.models.length > 0) {
      this.modelSelect.style.display = '';
      this.modelCustomInput.style.display = 'none';
      this.modelSelect.innerHTML = '';
      for (const m of preset.models) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        this.modelSelect.appendChild(opt);
      }
      if (savedModel && preset.models.includes(savedModel)) {
        this.modelSelect.value = savedModel;
      } else {
        this.modelSelect.value = preset.model;
      }
    } else {
      this.modelSelect.style.display = 'none';
      this.modelCustomInput.style.display = '';
      this.modelCustomInput.value = savedModel || '';
    }
  }

  async loadSettings() {
    this.apiKeyInput.value = await window.electronAPI.getStore('apiKey') || '';
    const opacity = await window.electronAPI.getStore('opacity') || 1;
    this.opacityInput.value = opacity;
    this.opacityValue.textContent = Math.round(opacity * 100) + '%';

    const savedPreset = await window.electronAPI.getStore('apiPreset') || 'custom';
    this.presetSelect.value = savedPreset;

    const savedModel = await window.electronAPI.getStore('modelName') || '';
    const savedUrl = await window.electronAPI.getStore('apiBaseUrl') || '';
    this.populateModels(savedPreset, savedModel, savedUrl);

    // V1.1: Load personality
    if (this.personalitySelect) {
      const savedPersonality = await window.electronAPI.getStore('catPersonality') || 'lively';
      this.personalitySelect.value = savedPersonality;
    }

    // V1.1: Render memory list
    this._renderMemoryList();

    // V1.2: Load skill settings
    const skillsEnabled = await window.electronAPI.getStore('skillsEnabled') || {};
    const skillTextConverter = document.getElementById('skill-text-converter');
    const skillDailyReport = document.getElementById('skill-daily-report');
    const skillTodoExtractor = document.getElementById('skill-todo-extractor');
    const skillReportHour = document.getElementById('skill-report-hour');
    if (skillTextConverter) skillTextConverter.checked = skillsEnabled.textConverter !== false;
    if (skillDailyReport) skillDailyReport.checked = skillsEnabled.dailyReport !== false;
    if (skillTodoExtractor) skillTodoExtractor.checked = skillsEnabled.todoExtractor !== false;
    if (skillReportHour) skillReportHour.value = await window.electronAPI.getStore('dailyReportHour') || 18;

    const todoIntervalInput = document.getElementById('todo-remind-interval');
    if (todoIntervalInput) todoIntervalInput.value = await window.electronAPI.getStore('todoRemindInterval') || 30;

    // V1.5: Load daily report output dir
    const reportDirInput = document.getElementById('daily-report-dir');
    if (reportDirInput) {
      reportDirInput.value = await window.electronAPI.getStore('dailyReportOutputDir') || '';
    }

    // V1.2: Load proactive settings
    const proactiveConfig = await window.electronAPI.getStore('proactiveConfig') || {};
    const proactiveEnabled = document.getElementById('proactive-enabled');
    const proactiveMaxDaily = document.getElementById('proactive-max-daily');
    const proactiveFreqValue = document.getElementById('proactive-freq-value');
    const quietStart = document.getElementById('quiet-start');
    const quietEnd = document.getElementById('quiet-end');

    if (proactiveEnabled) proactiveEnabled.checked = proactiveConfig.enabled !== false;
    if (proactiveMaxDaily) {
      proactiveMaxDaily.value = proactiveConfig.maxDailyInteractions || 8;
      if (proactiveFreqValue) proactiveFreqValue.textContent = proactiveMaxDaily.value;
    }
    if (quietStart) quietStart.value = proactiveConfig.quietHours?.start ?? 23;
    if (quietEnd) quietEnd.value = proactiveConfig.quietHours?.end ?? 7;

    const enabledTypes = proactiveConfig.enabledSceneTypes || ['info', 'care', 'efficiency', 'chat'];
    const sceneInfo = document.getElementById('scene-info');
    const sceneCare = document.getElementById('scene-care');
    const sceneEfficiency = document.getElementById('scene-efficiency');
    const sceneChat = document.getElementById('scene-chat');
    if (sceneInfo) sceneInfo.checked = enabledTypes.includes('info');
    if (sceneCare) sceneCare.checked = enabledTypes.includes('care');
    if (sceneEfficiency) sceneEfficiency.checked = enabledTypes.includes('efficiency');
    if (sceneChat) sceneChat.checked = enabledTypes.includes('chat');

    // Snapshot for dirty-check
    this._snapshotSettings();
  }

  _renderMemoryList() {
    const listEl = document.getElementById('memory-list');
    if (!listEl) return;
    const mm = this.aiService._memoryManager;
    if (!mm) {
      listEl.innerHTML = '<div class="memory-empty"><img src="illustrations/empty-memory.png" class="ill-empty" alt=""><div>暂无记忆</div></div>';
      return;
    }

    const memories = mm.getAll();
    if (memories.length === 0) {
      listEl.innerHTML = '<div class="memory-empty"><img src="illustrations/empty-memory.png" class="ill-empty" alt=""><div>暂无记忆</div></div>';
      return;
    }

    listEl.innerHTML = '';
    for (const mem of memories) {
      const item = document.createElement('div');
      item.className = 'memory-item';

      const catBadge = document.createElement('span');
      catBadge.className = 'memory-category';
      catBadge.textContent = mem.category;

      const factEl = document.createElement('span');
      factEl.className = 'memory-fact';
      factEl.textContent = mem.fact;

      const delBtn = document.createElement('button');
      delBtn.className = 'memory-delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        mm.deleteMemory(mem.id);
        this._renderMemoryList();
      });

      item.appendChild(catBadge);
      item.appendChild(factEl);
      item.appendChild(delBtn);
      listEl.appendChild(item);
    }
  }

  switchTab(tabName) {
    // If leaving settings tab, check for unsaved changes
    if (this._currentTab === 'settings' && tabName !== 'settings') {
      if (this._isSettingsDirty()) {
        const save = confirm('设置有未保存的更改，是否保存？');
        if (save) {
          document.getElementById('settings-save').click();
          return; // save handler will switchTab to chat
        }
      }
    }

    this._currentTab = tabName;
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    this.tabChat.classList.toggle('active', tabName === 'chat');
    this.tabSettings.classList.toggle('active', tabName === 'settings');

    if (tabName === 'settings') {
      this.loadSettings();
    }
    if (tabName === 'chat') {
      this.inputEl.focus();
      this.scrollToBottom();
    }
  }

  _snapshotSettings() {
    this._settingsSnapshot = {
      preset: this.presetSelect?.value,
      apiUrl: this.apiUrlInput?.value,
      model: this.modelSelect?.value,
      modelCustom: this.modelCustomInput?.value,
      apiKey: this.apiKeyInput?.value,
      opacity: this.opacityInput?.value,
      personality: this.personalitySelect?.value,
      skillTextConverter: document.getElementById('skill-text-converter')?.checked,
      skillDailyReport: document.getElementById('skill-daily-report')?.checked,
      skillTodoExtractor: document.getElementById('skill-todo-extractor')?.checked,
      reportHour: document.getElementById('skill-report-hour')?.value,
      todoInterval: document.getElementById('todo-remind-interval')?.value,
      proactiveEnabled: document.getElementById('proactive-enabled')?.checked,
      proactiveMaxDaily: document.getElementById('proactive-max-daily')?.value,
      quietStart: document.getElementById('quiet-start')?.value,
      quietEnd: document.getElementById('quiet-end')?.value,
      sceneInfo: document.getElementById('scene-info')?.checked,
      sceneCare: document.getElementById('scene-care')?.checked,
      sceneEfficiency: document.getElementById('scene-efficiency')?.checked,
      sceneChat: document.getElementById('scene-chat')?.checked
    };
  }

  _isSettingsDirty() {
    if (!this._settingsSnapshot) return false;
    const s = this._settingsSnapshot;
    return (
      s.preset !== this.presetSelect?.value ||
      s.apiUrl !== this.apiUrlInput?.value ||
      s.model !== this.modelSelect?.value ||
      s.modelCustom !== this.modelCustomInput?.value ||
      s.apiKey !== this.apiKeyInput?.value ||
      s.opacity !== this.opacityInput?.value ||
      s.personality !== this.personalitySelect?.value ||
      s.skillTextConverter !== document.getElementById('skill-text-converter')?.checked ||
      s.skillDailyReport !== document.getElementById('skill-daily-report')?.checked ||
      s.skillTodoExtractor !== document.getElementById('skill-todo-extractor')?.checked ||
      s.reportHour !== document.getElementById('skill-report-hour')?.value ||
      s.todoInterval !== document.getElementById('todo-remind-interval')?.value ||
      s.proactiveEnabled !== document.getElementById('proactive-enabled')?.checked ||
      s.proactiveMaxDaily !== document.getElementById('proactive-max-daily')?.value ||
      s.quietStart !== document.getElementById('quiet-start')?.value ||
      s.quietEnd !== document.getElementById('quiet-end')?.value ||
      s.sceneInfo !== document.getElementById('scene-info')?.checked ||
      s.sceneCare !== document.getElementById('scene-care')?.checked ||
      s.sceneEfficiency !== document.getElementById('scene-efficiency')?.checked ||
      s.sceneChat !== document.getElementById('scene-chat')?.checked
    );
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    if (this.isMaximized) {
      this.savedPosition = {
        left: this.container.style.left,
        top: this.container.style.top,
        bottom: this.container.style.bottom,
        right: this.container.style.right
      };
      this.container.classList.add('maximized');
      this.maximizeBtn.textContent = '❐';
      this.maximizeBtn.title = '还原';
    } else {
      this.container.classList.remove('maximized');
      this.maximizeBtn.textContent = '□';
      this.maximizeBtn.title = '最大化';
      if (this.savedPosition) {
        Object.assign(this.container.style, this.savedPosition);
        this.savedPosition = null;
      }
    }
    this.scrollToBottom();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.container.classList.remove('hidden');
    this.isVisible = true;
    if (this.positionFn) this.positionFn(this.container);
    // Ensure window accepts mouse input so the user can click the input field
    window.electronAPI.setIgnoreMouse(false);
    this.inputEl.focus();
    this.scrollToBottom();
  }

  hide() {
    // Check for unsaved settings if on settings tab
    if (this._currentTab === 'settings' && this._isSettingsDirty()) {
      const save = confirm('设置有未保存的更改，是否保存？');
      if (save) {
        document.getElementById('settings-save').click();
        return; // save handler will switchTab then we can close
      }
    }
    this._currentTab = 'chat';
    this.container.classList.add('hidden');
    this.isVisible = false;
    if (this.isMaximized) {
      this.isMaximized = false;
      this.container.classList.remove('maximized');
      this.maximizeBtn.textContent = '□';
      if (this.savedPosition) {
        Object.assign(this.container.style, this.savedPosition);
        this.savedPosition = null;
      }
    }
  }

  async sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text || this.isStreaming) return;

    if (text === '/clear') {
      this.aiService.clearHistory();
      this.messagesEl.innerHTML = '';
      this.inputEl.value = '';
      this.addMessage('聊天记录已清除！(=^.^=)', 'assistant');
      return;
    }

    this.inputEl.value = '';
    this.addMessage(text, 'user');

    // V1.5: Try SkillRouter first
    if (this._skillRouter) {
      try {
        const matched = await this._skillRouter.match(text);
        if (matched) {
          await this._executeSkill(matched, text);
          return;
        }
      } catch (err) {
        console.warn('[ChatUI] SkillRouter error:', err);
      }
    }

    const msgEl = this.addMessage('', 'assistant');
    this.isStreaming = true;
    this.character.triggerHappy();

    let fullResp = '';
    try {
      for await (const chunk of this.aiService.sendMessageStream(text)) {
        msgEl.textContent += chunk;
        fullResp += chunk;
        this.scrollToBottom();
      }
    } catch (err) {
      msgEl.classList.add('error');
      msgEl.textContent = `错误：${err.message}`;
    }

    this.isStreaming = false;

    // V1.1: Sentiment-based cat expression
    if (this._onSentiment && this.aiService.lastSentiment) {
      this._onSentiment(this.aiService.lastSentiment);
    }

    // V1.1: Auto-parse todos from conversation
    if (this._todoParser && fullResp) {
      this._todoParser.tryParse(text, fullResp).catch((e) => {
        console.warn('[ChatUI] TodoParser error:', e);
      });
    }
  }

  addMessage(text, role) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.textContent = text;
    this.messagesEl.appendChild(msgEl);
    this.scrollToBottom();
    return msgEl;
  }

  /**
   * Execute a matched skill: show waiting → call AI → save file → show link.
   */
  async _executeSkill(skillMeta, userText) {
    const waitEl = this.addMessage('⏳ 生成中，请稍候...', 'assistant');

    try {
      const { result } = await this._skillRouter.execute(skillMeta.name, userText);

      if (!result || !result.success) {
        waitEl.textContent = result?.output || '执行失败';
        waitEl.classList.add('error');
        return;
      }

      // Only daily-report saves to file
      if (skillMeta.name === 'daily-report') {
        const outputDir = await window.electronAPI.getStore('dailyReportOutputDir');
        if (outputDir) {
          const today = new Date().toISOString().split('T')[0];
          const fileName = `daily-report_${today}.md`;
          const filePath = outputDir.replace(/\\/g, '/') + '/' + fileName;

          await window.electronAPI.saveFile(filePath, result.output);

          waitEl.innerHTML = '';
          const doneText = document.createTextNode('✅ 日报已生成！点击打开：');
          const link = document.createElement('a');
          link.href = '#';
          link.textContent = fileName;
          link.style.cssText = 'color:#4a9eff;text-decoration:underline;cursor:pointer;';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            window.electronAPI.openFilePath(filePath);
          });
          waitEl.appendChild(doneText);
          waitEl.appendChild(link);
          this.scrollToBottom();
          return;
        }
      }

      // Default: show result inline
      if (result.outputType === 'markdown') {
        waitEl.innerHTML = this._renderSimpleMarkdown(result.output || '');
      } else {
        waitEl.textContent = result.output || '(无输出)';
      }
    } catch (err) {
      waitEl.textContent = `执行错误: ${err.message}`;
      waitEl.classList.add('error');
    }

    this.scrollToBottom();
  }

  /**
   * Simple markdown to HTML renderer for skill output.
   */
  _renderSimpleMarkdown(md) {
    return md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<strong style="font-size:1.1em">$1</strong>')
      .replace(/^# (.+)$/gm, '<strong style="font-size:1.2em">$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/^- \[x\] (.+)$/gm, '✅ <del>$1</del>')
      .replace(/^- \[ \] (.+)$/gm, '⬜ $1')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/^\d+\. (.+)$/gm, (_, text, offset, str) => `• ${text}`)
      .replace(/\n/g, '<br>');
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  async loadHistory() {
    const history = await window.electronAPI.getStore('chatHistory');
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-10);
      for (const msg of recent) {
        this.addMessage(msg.content, msg.role);
      }
    }
  }
}
