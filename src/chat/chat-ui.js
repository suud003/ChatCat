/**
 * Chat UI - manga speech bubble with drag & collapse
 */

export class ChatUI {
  constructor(aiService, character) {
    this.aiService = aiService;
    this.character = character;
    this.isVisible = false;
    this.isStreaming = false;
    this.isCollapsed = false;

    this.container = document.getElementById('chat-container');
    this.bubbleEl = document.getElementById('chat-bubble');
    this.bodyEl = document.getElementById('chat-body');
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.collapseBtn = document.getElementById('chat-collapse');
    this.closeBtn = document.getElementById('chat-close');
    this.headerEl = document.getElementById('chat-bubble-header');

    this.setupEvents();
    this.setupDrag();
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

    this.collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });

    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Toggle from main process
    window.electronAPI.onToggleChat(() => this.toggle());
  }

  setupDrag() {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    this.headerEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      // Switch to top/left positioning for dragging
      this.container.style.left = origLeft + 'px';
      this.container.style.top = origTop + 'px';
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.container.style.left = (origLeft + dx) + 'px';
      this.container.style.top = (origTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.bodyEl.classList.toggle('collapsed', this.isCollapsed);
    this.collapseBtn.textContent = this.isCollapsed ? '+' : '−';
    this.collapseBtn.title = this.isCollapsed ? 'Expand' : 'Collapse';
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    // Reset position to default
    this.container.style.left = '10px';
    this.container.style.bottom = '280px';
    this.container.style.top = 'auto';
    this.container.style.right = 'auto';
    this.container.classList.remove('hidden');
    this.isVisible = true;
    // Expand if collapsed
    if (this.isCollapsed) {
      this.isCollapsed = false;
      this.bodyEl.classList.remove('collapsed');
      this.collapseBtn.textContent = '−';
    }
    this.inputEl.focus();
    this.scrollToBottom();
  }

  hide() {
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  async sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text || this.isStreaming) return;

    // Expand if collapsed
    if (this.isCollapsed) {
      this.toggleCollapse();
    }

    // Clear commands
    if (text === '/clear') {
      this.aiService.clearHistory();
      this.messagesEl.innerHTML = '';
      this.inputEl.value = '';
      this.addMessage('Chat history cleared! (=^.^=)', 'assistant');
      return;
    }

    this.inputEl.value = '';
    this.addMessage(text, 'user');

    // Create streaming message element
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
