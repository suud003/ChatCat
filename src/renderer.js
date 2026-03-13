/**
 * Renderer entry point - initializes all modules
 */

import { SpriteCharacter } from './pet/pixel-character.js';
import { CHARACTER_PRESETS, CATEGORIES } from './pet/live2d-character.js';
import { InputTracker } from './input/tracker.js';
import { AIService } from './chat/ai-service.js';
import { ChatUI } from './chat/chat-ui.js';
import { SystemInfoWidget } from './widgets/system-info.js';
import { TypeRecorder } from './recorder/type-recorder.js';

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
  },
  openclaw: {
    url: '', model: '',
    models: [],
    needsUrl: true
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

  // Chat UI (with integrated settings)
  const chatUI = new ChatUI(aiService, characterProxy, API_PRESETS);
  chatUI.positionFn = positionAbovePet;
  await chatUI.loadHistory();

  // System info widget
  const widget = new SystemInfoWidget();
  widget.positionFn = positionAbovePet;

  // Type recorder
  const typeRecorder = new TypeRecorder();
  typeRecorder.positionFn = positionAbovePet;

  // Setup UI
  setupToolbar(chatUI, widget, typeRecorder);
  setupToolbarHover();
  setupDrag();
  setupClickThrough();
  setupCharacterSelect(spriteCharacter);

  console.log('ChatCat Desktop Pet initialized!');
}

function setupToolbar(chatUI, widget, typeRecorder) {
  const toolbar = document.getElementById('toolbar');
  toolbar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;

    e.stopPropagation();
    const action = btn.dataset.action;

    switch (action) {
      case 'chat':
        chatUI.toggle();
        break;
      case 'widget':
        widget.toggle();
        break;
      case 'character':
        const charPanel = document.getElementById('character-select');
        const wasHidden = charPanel.classList.contains('hidden');
        charPanel.classList.toggle('hidden');
        if (wasHidden) positionAbovePet(charPanel);
        break;
      case 'recorder':
        typeRecorder.toggle();
        break;
    }
  });
}

/**
 * Position a panel above the pet container, centered horizontally
 */
function positionAbovePet(panel) {
  if (panel.classList.contains('maximized')) return;
  // Only set position if not already manually dragged (no inline left/top)
  if (panel.style.left && panel.style.top) return;

  const petContainer = document.getElementById('pet-container');
  const petRect = petContainer.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 280;

  const left = petRect.left + (petRect.width / 2) - (panelWidth / 2);
  const top = petRect.top - panel.offsetHeight - 20;

  panel.style.left = Math.max(10, left) + 'px';
  panel.style.top = Math.max(10, top) + 'px';
  panel.style.bottom = 'auto';
  panel.style.right = 'auto';
  panel.style.transform = 'none';
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
  const panelIds = ['chat-container', 'recorder-container', 'widget-container', 'character-select'];
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

      // Move pet
      const petRect = petContainer.getBoundingClientRect();
      petContainer.style.left = (petRect.left + dx) + 'px';
      petContainer.style.top = (petRect.top + dy) + 'px';

      // Move all visible, non-maximized panels along with pet
      for (const id of panelIds) {
        const panel = document.getElementById(id);
        if (panel.classList.contains('hidden') || panel.classList.contains('maximized')) continue;
        const rect = panel.getBoundingClientRect();
        panel.style.left = (rect.left + dx) + 'px';
        panel.style.top = (rect.top + dy) + 'px';
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.transform = 'none';
      }
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.getElementById('pet-container').style.cursor = 'grab';
  });
}

// Fullscreen click-through: transparent areas pass through,
// but any visible element captures mouse events
function setupClickThrough() {
  // When mouse enters any interactive element, disable click-through
  document.addEventListener('mouseenter', (e) => {
    const el = e.target;
    if (el.closest('#pet-container') || el.closest('#chat-container') ||
        el.closest('#recorder-container') || el.closest('#widget-container') ||
        el.closest('#character-select')) {
      window.electronAPI.setIgnoreMouse(false);
    }
  }, true);

  // When mouse leaves all interactive areas back to transparent body, re-enable click-through
  document.addEventListener('mouseleave', (e) => {
    const el = e.target;
    if (el.closest('#pet-container') || el.closest('#chat-container') ||
        el.closest('#recorder-container') || el.closest('#widget-container') ||
        el.closest('#character-select')) {
      // Check if relatedTarget is still within an interactive area
      const to = e.relatedTarget;
      if (!to || (!to.closest('#pet-container') && !to.closest('#chat-container') &&
          !to.closest('#recorder-container') && !to.closest('#widget-container') &&
          !to.closest('#character-select'))) {
        window.electronAPI.setIgnoreMouse(true);
      }
    }
  }, true);
}

function setupCharacterSelect(spriteCharacter) {
  const grid = document.getElementById('character-grid');
  const panel = document.getElementById('character-select');
  const charHeader = document.getElementById('character-bubble-header');
  const charBody = document.getElementById('character-body');
  const tabsContainer = document.getElementById('character-tabs');
  const searchInput = document.getElementById('character-search');
  const errorToast = document.getElementById('character-error-toast');
  const closeBtn = document.getElementById('character-close-x');
  const maximizeBtn = document.getElementById('character-maximize');

  let currentCategory = 'all';
  let searchQuery = '';
  let isMaximized = false;
  let savedPosition = null;

  // Close
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.add('hidden');
    if (isMaximized) {
      isMaximized = false;
      panel.classList.remove('maximized');
      maximizeBtn.textContent = '□';
      if (savedPosition) {
        Object.assign(panel.style, savedPosition);
        savedPosition = null;
      }
    }
  });

  // Maximize
  maximizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMaximized = !isMaximized;
    if (isMaximized) {
      savedPosition = {
        left: panel.style.left,
        top: panel.style.top,
        bottom: panel.style.bottom,
        right: panel.style.right,
        transform: panel.style.transform
      };
      panel.classList.add('maximized');
      maximizeBtn.textContent = '❐';
      maximizeBtn.title = 'Restore';
    } else {
      panel.classList.remove('maximized');
      maximizeBtn.textContent = '□';
      maximizeBtn.title = 'Maximize';
      if (savedPosition) {
        Object.assign(panel.style, savedPosition);
        savedPosition = null;
      }
    }
  });

  // Drag
  {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    charHeader.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      panel.style.left = origLeft + 'px';
      panel.style.top = origTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = (origLeft + (e.clientX - startX)) + 'px';
      panel.style.top = (origTop + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });
  }

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

      const typeBadge = preset.type === 'instrument' ? 'Instrument' :
                        preset.type === 'combo' ? 'Combo' : 'Skin';

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
}

// Start the app
init().catch(console.error);
