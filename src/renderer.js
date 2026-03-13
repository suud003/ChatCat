/**
 * Renderer entry point - initializes all modules
 */

import { SpriteCharacter } from './pet/pixel-character.js';
import { CHARACTER_PRESETS, CATEGORIES } from './pet/live2d-character.js';
import { InputTracker } from './input/tracker.js';
import { AIService } from './chat/ai-service.js';
import { ChatUI } from './chat/chat-ui.js';
import { SystemInfoWidget } from './widgets/system-info.js';

// Preset API configurations
const API_PRESETS = {
  openai: {
    url: 'https://api.openai.com/v1', model: 'gpt-4.1',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini', 'o4-mini', 'o1', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  claude: {
    url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5', 'claude-sonnet-4-0', 'claude-opus-4-0', 'claude-3-haiku-20240307']
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1', model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4.1',
    models: [
      'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4o', 'openai/o3', 'openai/o4-mini',
      'anthropic/claude-opus-4-6', 'anthropic/claude-sonnet-4-6', 'anthropic/claude-haiku-4-5',
      'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.0-flash',
      'deepseek/deepseek-chat', 'deepseek/deepseek-reasoner',
      'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout'
    ]
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview']
  }
};

// Active character reference
let activeCharacter = null;

async function init() {
  const canvas = document.getElementById('pet-canvas');

  // Sprite-based character
  const spriteCharacter = new SpriteCharacter(canvas);
  await spriteCharacter.load();
  spriteCharacter.start();
  activeCharacter = spriteCharacter;

  // Restore saved skin
  const savedCharId = await window.electronAPI.getStore('character');
  if (savedCharId) {
    spriteCharacter.loadSkin(savedCharId);
  }

  // Input tracker proxy
  const characterProxy = {
    triggerTyping: () => activeCharacter.triggerTyping(),
    triggerClick: () => activeCharacter.triggerClick(),
    triggerHappy: () => activeCharacter.triggerHappy?.(),
  };
  const inputTracker = new InputTracker(characterProxy);

  // AI service
  const aiService = new AIService();
  await aiService.loadConfig();

  // Chat UI
  const chatUI = new ChatUI(aiService, characterProxy);
  await chatUI.loadHistory();

  // System info widget
  const widget = new SystemInfoWidget();

  // Setup UI
  setupToolbar(chatUI, widget);
  setupToolbarHover();
  setupDrag();
  setupSettings(aiService);
  setupCharacterSelect(spriteCharacter);

  console.log('ChatCat Desktop Pet initialized!');
}

// Store settings loader globally for toolbar access
let openSettingsPanel = null;

function setupToolbar(chatUI, widget) {
  const toolbar = document.getElementById('toolbar');
  toolbar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;

    e.stopPropagation();
    const action = btn.dataset.action;

    switch (action) {
      case 'settings':
        if (openSettingsPanel) openSettingsPanel();
        break;
      case 'chat':
        chatUI.toggle();
        break;
      case 'widget':
        widget.toggle();
        break;
      case 'character':
        document.getElementById('character-select').classList.remove('hidden');
        break;
    }
  });
}

function setupToolbarHover() {
  const petContainer = document.getElementById('pet-container');
  const toolbar = document.getElementById('toolbar');
  let hideTimeout = null;

  function showToolbar() {
    clearTimeout(hideTimeout);
    toolbar.classList.add('visible');
  }

  function hideToolbar() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      toolbar.classList.remove('visible');
    }, 400);
  }

  petContainer.addEventListener('mouseenter', showToolbar);
  petContainer.addEventListener('mouseleave', hideToolbar);
  toolbar.addEventListener('mouseenter', showToolbar);
  toolbar.addEventListener('mouseleave', hideToolbar);
}

function setupDrag() {
  const petContainer = document.getElementById('pet-container');
  let isDragging = false;
  let lastX, lastY;

  petContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('#toolbar') || e.target.closest('.toolbar-btn')) return;
    if (e.button === 0) {
      isDragging = true;
      lastX = e.screenX;
      lastY = e.screenY;
      petContainer.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.screenX - lastX;
      const dy = e.screenY - lastY;
      lastX = e.screenX;
      lastY = e.screenY;
      window.electronAPI.dragWindow(dx, dy);
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.getElementById('pet-container').style.cursor = 'grab';
  });
}

function setupSettings(aiService) {
  const settingsContainer = document.getElementById('settings-container');
  const presetSelect = document.getElementById('setting-preset');
  const modelSelect = document.getElementById('setting-model');
  const modelCustomInput = document.getElementById('setting-model-custom');
  const apiKeyInput = document.getElementById('setting-api-key');
  const opacityInput = document.getElementById('setting-opacity');
  const opacityValue = document.getElementById('opacity-value');

  function populateModels(presetKey, savedModel) {
    const preset = API_PRESETS[presetKey];
    if (preset && preset.models) {
      modelSelect.style.display = '';
      modelCustomInput.style.display = 'none';
      modelSelect.innerHTML = '';
      for (const m of preset.models) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      }
      if (savedModel && preset.models.includes(savedModel)) {
        modelSelect.value = savedModel;
      } else {
        modelSelect.value = preset.model;
      }
    } else {
      modelSelect.style.display = 'none';
      modelCustomInput.style.display = '';
      modelCustomInput.value = savedModel || '';
    }
  }

  presetSelect.addEventListener('change', () => {
    populateModels(presetSelect.value, null);
  });

  async function loadSettings() {
    apiKeyInput.value = await window.electronAPI.getStore('apiKey') || '';
    const opacity = await window.electronAPI.getStore('opacity') || 1;
    opacityInput.value = opacity;
    opacityValue.textContent = Math.round(opacity * 100) + '%';

    const savedPreset = await window.electronAPI.getStore('apiPreset') || 'custom';
    presetSelect.value = savedPreset;

    const savedModel = await window.electronAPI.getStore('modelName') || '';
    populateModels(savedPreset, savedModel);
  }

  opacityInput.addEventListener('input', () => {
    const val = parseFloat(opacityInput.value);
    opacityValue.textContent = Math.round(val * 100) + '%';
  });

  document.getElementById('settings-save').addEventListener('click', async () => {
    const presetKey = presetSelect.value;
    const preset = API_PRESETS[presetKey];

    let selectedModel;
    if (preset) {
      await window.electronAPI.setStore('apiBaseUrl', preset.url);
      selectedModel = modelSelect.value;
    } else {
      selectedModel = modelCustomInput.value.trim();
    }
    await window.electronAPI.setStore('modelName', selectedModel);

    await window.electronAPI.setStore('apiKey', apiKeyInput.value);
    await window.electronAPI.setStore('opacity', parseFloat(opacityInput.value));
    await window.electronAPI.setStore('apiPreset', presetKey);

    await aiService.loadConfig();

    settingsContainer.classList.add('hidden');
  });

  document.getElementById('settings-close').addEventListener('click', () => {
    settingsContainer.classList.add('hidden');
  });

  const showSettings = async () => {
    await loadSettings();
    settingsContainer.classList.remove('hidden');
  };
  openSettingsPanel = showSettings;
  window.electronAPI.onOpenSettings(showSettings);
}

function setupCharacterSelect(spriteCharacter) {
  const grid = document.getElementById('character-grid');
  const panel = document.getElementById('character-select');
  const tabsContainer = document.getElementById('character-tabs');
  const searchInput = document.getElementById('character-search');
  const errorToast = document.getElementById('character-error-toast');

  let currentCategory = 'all';
  let searchQuery = '';

  // Build category tabs
  CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'character-tab' + (cat.id === 'all' ? ' active' : '');
    tab.textContent = cat.name;
    tab.dataset.category = cat.id;
    tab.addEventListener('click', () => {
      currentCategory = cat.id;
      tabsContainer.querySelectorAll('.character-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGrid();
    });
    tabsContainer.appendChild(tab);
  });

  // Search input
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderGrid();
  });

  // Render grid
  async function renderGrid() {
    grid.innerHTML = '';

    const filtered = CHARACTER_PRESETS.filter(p => {
      const matchCategory = currentCategory === 'all' || p.category === currentCategory;
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery) ||
        p.id.toLowerCase().includes(searchQuery) ||
        (p.description && p.description.toLowerCase().includes(searchQuery));
      return matchCategory && matchSearch;
    });

    const currentCharId = await window.electronAPI.getStore('character') || 'bongo-classic';

    for (const preset of filtered) {
      const card = document.createElement('div');
      card.className = 'character-card' + (preset.id === currentCharId ? ' active' : '');
      card.dataset.id = preset.id;

      // Gradient initial avatar
      const initials = preset.name.charAt(0).toUpperCase();
      const c = preset.color || { from: '#74b9ff', to: '#0984e3' };
      const thumbnailHtml = `<span class="avatar-initial" style="background:linear-gradient(135deg,${c.from},${c.to})">${initials}</span>`;

      const typeBadge = 'Sprite';

      card.innerHTML = `
        <div class="card-thumbnail cat-${preset.category}">
          ${thumbnailHtml}
          <span class="card-type-badge">${typeBadge}</span>
        </div>
        <div class="card-name">${preset.name}</div>
        <div class="card-tooltip">${preset.description} (${preset.type})</div>
      `;
      card.addEventListener('click', () => switchCharacter(preset));
      grid.appendChild(card);
    }
  }

  renderGrid();

  function showError(msg) {
    errorToast.textContent = msg;
    errorToast.classList.remove('hidden');
    setTimeout(() => errorToast.classList.add('hidden'), 3000);
  }

  async function switchCharacter(preset) {
    spriteCharacter.loadSkin(preset.id);
    await window.electronAPI.setStore('character', preset.id);
    renderGrid();
    panel.classList.add('hidden');
  }

  // Close buttons
  document.getElementById('character-close-x').addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  document.getElementById('character-select').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      panel.classList.add('hidden');
    }
  });
}

// Start the app
init().catch(console.error);
