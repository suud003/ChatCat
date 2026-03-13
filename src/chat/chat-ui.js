/**
 * Chat UI - manga speech bubble with tabs (Chat / Settings), drag & maximize
 */

export class ChatUI {
  constructor(aiService, character, apiPresets) {
    this.aiService = aiService;
    this.character = character;
    this.apiPresets = apiPresets || {};
    this.isVisible = false;
    this.isStreaming = false;
    this.isMaximized = false;
    this.savedPosition = null;

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

    this.positionFn = null; // set by renderer.js for dynamic positioning

    this.setupEvents();
    this.setupDrag();
    this.setupSettingsEvents();
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

      await this.aiService.loadConfig();

      // Switch back to chat tab after save
      this.switchTab('chat');
    });
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
  }

  switchTab(tabName) {
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
      this.maximizeBtn.title = 'Restore';
    } else {
      this.container.classList.remove('maximized');
      this.maximizeBtn.textContent = '□';
      this.maximizeBtn.title = 'Maximize';
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
    this.inputEl.focus();
    this.scrollToBottom();
  }

  hide() {
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
      this.addMessage('Chat history cleared! (=^.^=)', 'assistant');
      return;
    }

    this.inputEl.value = '';
    this.addMessage(text, 'user');

    const msgEl = this.addMessage('', 'assistant');
    this.isStreaming = true;
    this.character.triggerHappy();

    try {
      for await (const chunk of this.aiService.sendMessageStream(text)) {
        msgEl.textContent += chunk;
        this.scrollToBottom();
      }
    } catch (err) {
      msgEl.classList.add('error');
      msgEl.textContent = `Error: ${err.message}`;
    }

    this.isStreaming = false;
  }

  addMessage(text, role) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.textContent = text;
    this.messagesEl.appendChild(msgEl);
    this.scrollToBottom();
    return msgEl;
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
