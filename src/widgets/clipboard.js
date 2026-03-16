/**
 * Clipboard Manager Widget
 *
 * Displays clipboard history, allows click-to-copy and delete.
 * Listens for clipboard updates from main process.
 */

export class ClipboardWidget {
  constructor(aiService, showBubbleFn) {
    this._aiService = aiService;
    this._showBubble = showBubbleFn;
    this._history = [];
    this._listEl = document.getElementById('clipboard-list');
    this._clearBtn = document.getElementById('clipboard-clear-btn');
    this._emptyEl = document.getElementById('clipboard-empty');

    this._init();
  }

  async _init() {
    // Load existing history
    this._history = await window.electronAPI.clipboardGetHistory() || [];
    this._render();

    // Listen for updates from main
    window.electronAPI.onClipboardUpdate((item) => {
      this._history.unshift(item);
      if (this._history.length > 50) this._history.pop();
      this._render();
    });

    // Clear button
    this._clearBtn?.addEventListener('click', async () => {
      await window.electronAPI.clipboardClear();
      this._history = [];
      this._render();
    });
  }

  _render() {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';

    if (this._history.length === 0) {
      if (this._emptyEl) this._emptyEl.classList.remove('hidden');
      return;
    }
    if (this._emptyEl) this._emptyEl.classList.add('hidden');

    for (const item of this._history) {
      const row = document.createElement('div');
      row.className = 'clipboard-item';

      const timeEl = document.createElement('span');
      timeEl.className = 'clipboard-time';
      timeEl.textContent = this._formatTime(item.timestamp);

      const textEl = document.createElement('span');
      textEl.className = 'clipboard-text';
      textEl.textContent = item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text;
      textEl.title = item.text;

      const actions = document.createElement('span');
      actions.className = 'clipboard-actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'clipboard-action-btn';
      copyBtn.textContent = '📋';
      copyBtn.title = '复制';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.electronAPI.clipboardCopy(item.text);
        if (this._showBubble) this._showBubble('已复制到剪贴板~', 2000);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'clipboard-action-btn clipboard-delete';
      deleteBtn.textContent = '×';
      deleteBtn.title = '删除';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._history = this._history.filter(h => h.timestamp !== item.timestamp);
        this._render();
        // Sync deletion to main process
        window.electronAPI.clipboardClear().then(() => {
          // Re-push remaining items isn't practical, so just clear + local state
        });
      });

      actions.appendChild(copyBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(timeEl);
      row.appendChild(textEl);
      row.appendChild(actions);

      // Click entire row to copy
      row.addEventListener('click', async () => {
        await window.electronAPI.clipboardCopy(item.text);
        if (this._showBubble) this._showBubble('已复制到剪贴板~', 2000);
      });

      this._listEl.appendChild(row);
    }
  }

  _formatTime(ts) {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
