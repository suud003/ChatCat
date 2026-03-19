export class QuickPanelInlineUI {
  constructor({ positionFn = null, beforeShow = null } = {}) {
    this.positionFn = positionFn;
    this.beforeShow = beforeShow;

    this._mode = 'polish';
    this._qaHistory = [];
    this._isProcessing = false;
    this._historyVisible = false;
    this._pastedImageBase64 = null;

    this._container = document.getElementById('quick-container');
    this._inputArea = document.getElementById('quick-input-area');
    this._resultArea = document.getElementById('quick-result-area');
    this._statusBar = document.getElementById('quick-status-bar');
    this._previewEl = document.getElementById('quick-paste-image-preview');
  }

  init() {
    if (!this._container) return;

    document.querySelectorAll('#quick-container .quick-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#quick-container .quick-mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = btn.dataset.mode;
        if (this._mode === 'screenshot') {
          window.electronAPI.qpStartScreenshot?.();
        }
      });
    });

    document.getElementById('quick-send')?.addEventListener('click', () => this._send());
    document.getElementById('quick-history')?.addEventListener('click', () => this._showHistory());
    document.getElementById('quick-close')?.addEventListener('click', () => this.hide());

    document.addEventListener('keydown', (e) => {
      if (!this.isVisible()) return;
      if (e.key === 'Escape') {
        this.hide();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this._send();
      }
    });

    this._inputArea?.addEventListener('paste', (e) => this._handlePaste(e));

    window.electronAPI.onQpOpen?.((data) => {
      this.show(data).catch(() => {});
    });
    window.electronAPI.onQpCloseUI?.(() => {
      document.getElementById('quick-close')?.click();
    });
    window.electronAPI.onQpDisplayDirectResult?.((data) => {
      this.showDirectResult(data).catch(() => {});
    });
    window.electronAPI.onQpAutoRecognizeImage?.((data) => {
      this.show().then(() => {
        if (this._previewEl && data.dataUrl) {
          this._showPreview(`
            <img src="${data.dataUrl}" style="max-width:100%;max-height:80px;border-radius:8px;margin-bottom:4px;">
            <span style="font-size:11px;color:#888;">🔍 自动识别中...</span>
          `);
        }
        this._historyVisible = false;
        this._mode = 'screenshot';
        this._syncModeButtons();
        this._statusBar.textContent = '⏳ 正在自动识别剪贴板图片...';
      }).catch(() => {});
    });
    window.electronAPI.onQpStreamChunk?.((chunk) => {
      this._historyVisible = false;
      this._setResultVisible(true);
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += `${this._escapeHtml(chunk)}<span class="streaming-cursor"></span>`;
      this._resultArea.scrollTop = this._resultArea.scrollHeight;
    });
    window.electronAPI.onQpStreamEnd?.((result) => {
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._isProcessing = false;
      if (!result || !result.trim()) {
        this._resultArea.innerHTML = '<div style="color:#e53935;">⚠️ AI 未返回有效结果，请检查模型或 API 配置。</div>';
        this._statusBar.textContent = '⚠️ 未收到有效结果';
      } else {
        this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
      }
      if (this._mode === 'ask' && result) {
        this._qaHistory.push({ role: 'assistant', content: result });
      }
      this._addCopyHandler();
      this._addFeedbackButtons();
    });
    window.electronAPI.onQpStreamError?.((err) => {
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._setResultVisible(true);
      this._resultArea.innerHTML += `<div style="color:#e53935;">❌ ${this._escapeHtml(err)}</div>`;
      this._isProcessing = false;
      this._statusBar.textContent = '❌ 处理失败';
    });
  }

  isVisible() {
    return !!this._container && !this._container.classList.contains('hidden');
  }

  async show(data = {}) {
    if (!this._container) return;
    if (this.beforeShow) {
      await this.beforeShow();
    }
    this._container.classList.remove('hidden');
    this._setVisibleState(true);
    if (this.positionFn && !this._container.classList.contains('maximized')) {
      positionPanel(this._container, this.positionFn);
    }
    if (data.clipboardText && !this._inputArea.textContent.trim()) {
      this._inputArea.textContent = data.clipboardText;
    }
    this._inputArea.focus();
  }

  hide(report = true) {
    if (!this._container) return;
    this._container.classList.add('hidden');
    if (report) {
      this._setVisibleState(false);
    }
  }

  async showDirectResult(data) {
    await this.show();
    this._historyVisible = false;
    this._mode = data.mode;
    this._syncModeButtons();
    this._resultArea.innerHTML = this._escapeHtml(data.result);
    this._setResultVisible(true);
    this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
    this._addCopyHandler();
    this._addFeedbackButtons();
  }

  async _send() {
    if (this._isProcessing) return;

    const text = this._inputArea.textContent.trim();
    if (!text && this._mode !== 'screenshot' && !this._pastedImageBase64) return;

    this._isProcessing = true;
    this._historyVisible = false;
    this._resultArea.innerHTML = '<span class="streaming-cursor"></span>';
    this._setResultVisible(true);
    this._statusBar.textContent = '⏳ 处理中...';

    try {
      if (this._mode === 'screenshot' || this._pastedImageBase64) {
        if (this._pastedImageBase64) {
          const base64 = this._pastedImageBase64;
          this._pastedImageBase64 = null;
          this._clearPreview();
          await window.electronAPI.qpRecognizeImage?.(base64);
          this._isProcessing = false;
        } else {
          this._isProcessing = false;
          window.electronAPI.qpStartScreenshot?.();
        }
        return;
      }

      if (this._mode === 'ask') {
        this._qaHistory.push({ role: 'user', content: text });
        if (this._qaHistory.length > 20) {
          this._qaHistory = this._qaHistory.slice(-20);
        }
        await window.electronAPI.qpAsk?.(text, this._qaHistory);
        return;
      }

      await window.electronAPI.qpProcessText?.(this._mode, text);
    } catch (err) {
      this._resultArea.innerHTML = `<div style="color:#e53935;">❌ ${this._escapeHtml(err.message || String(err))}</div>`;
      this._setResultVisible(true);
      this._isProcessing = false;
    }
  }

  async _showHistory() {
    if (this._historyVisible) {
      this._resultArea.innerHTML = '';
      this._setResultVisible(false);
      this._historyVisible = false;
      return;
    }

    const history = await window.electronAPI.qpGetHistory?.();
    if (!history || history.length === 0) {
      this._resultArea.innerHTML = '<div style="color:#aaa;">暂无历史记录</div>';
      this._setResultVisible(true);
      this._historyVisible = true;
      return;
    }

    let html = '<div style="font-size:12px;font-weight:700;margin-bottom:6px;">最近处理记录</div>';
    for (const item of history.slice(-10).reverse()) {
      const time = new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const preview = this._escapeHtml((item.result || '').slice(0, 60).replace(/\n/g, ' '));
      html += `<div style="margin:4px 0;padding:6px;background:#f5f5f7;border-radius:8px;font-size:11px;">
        <span style="color:#888;">${time}</span> ${preview}...
      </div>`;
    }
    this._resultArea.innerHTML = html;
    this._setResultVisible(true);
    this._historyVisible = true;
  }

  _addCopyHandler() {
    this._resultArea.style.cursor = 'pointer';
    this._resultArea.onclick = async (e) => {
      if (e.target.closest('.feedback-actions')) return;

      const clone = this._resultArea.cloneNode(true);
      const feedbackEl = clone.querySelector('.feedback-actions');
      if (feedbackEl) feedbackEl.remove();
      const text = clone.textContent.trim();
      if (!text) return;

      await window.electronAPI.clipboardCopy?.(text);
      this._statusBar.textContent = '📋 已复制到剪贴板';
      setTimeout(() => {
        if (this._statusBar.textContent === '📋 已复制到剪贴板') {
          this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送';
        }
      }, 2000);
    };
  }

  _addFeedbackButtons() {
    if (this._mode === 'screenshot' && this._resultArea.textContent.includes('正在识别图片内容')) return;

    const clone = this._resultArea.cloneNode(true);
    const existFb = clone.querySelector('.feedback-actions');
    if (existFb) existFb.remove();
    if (!clone.textContent.trim()) return;

    const existingFeedback = this._resultArea.querySelector('.feedback-actions');
    if (existingFeedback) existingFeedback.remove();

    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-actions';
    feedbackDiv.innerHTML = `
      <button class="quick-action-btn quick-action-btn-secondary" id="quick-feedback-up">👍 有用</button>
      <button class="quick-action-btn quick-action-btn-secondary" id="quick-feedback-down">👎 不好</button>
      <button class="quick-action-btn quick-action-btn-secondary" id="quick-feedback-retry">🔄 重试</button>
    `;
    this._resultArea.appendChild(feedbackDiv);

    this._resultArea.querySelector('#quick-feedback-up')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._sendFeedback(1);
    });
    this._resultArea.querySelector('#quick-feedback-down')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._sendFeedback(-1);
    });
    this._resultArea.querySelector('#quick-feedback-retry')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._mode === 'screenshot') {
        window.electronAPI.qpStartScreenshot?.();
      } else {
        this._send();
      }
    });
  }

  _sendFeedback(rating) {
    window.electronAPI.qpSendFeedback?.({ mode: this._mode, rating, timestamp: Date.now() });
    this._statusBar.textContent = '✅ 感谢反馈！';
  }

  _setResultVisible(visible) {
    this._resultArea.classList.toggle('visible', visible);
    if (!visible) {
      this._resultArea.onclick = null;
      this._resultArea.style.cursor = '';
    }
  }

  _showPreview(html) {
    if (!this._previewEl) return;
    this._previewEl.innerHTML = html;
    this._previewEl.classList.add('visible');
  }

  _clearPreview() {
    if (!this._previewEl) return;
    this._previewEl.innerHTML = '';
    this._previewEl.classList.remove('visible');
  }

  _syncModeButtons() {
    document.querySelectorAll('#quick-container .quick-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === this._mode);
    });
  }

  _setVisibleState(visible) {
    window.electronAPI.qpSetVisible?.(visible);
  }

  _handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        this._pastedImageBase64 = base64;
        this._showPreview(`
          <img src="${dataUrl}" style="max-width:100%;max-height:80px;border-radius:8px;margin-bottom:4px;">
          <span style="font-size:11px;color:#888;cursor:pointer;" id="quick-remove-pasted-image">✕ 移除图片</span>
        `);
        document.getElementById('quick-remove-pasted-image')?.addEventListener('click', () => {
          this._pastedImageBase64 = null;
          this._clearPreview();
        });
        this._mode = 'screenshot';
        this._syncModeButtons();
        this._statusBar.textContent = '📸 已粘贴图片 · 点击发送识别';
      };
      reader.readAsDataURL(file);
      return;
    }
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

function positionPanel(container, positionFn) {
  positionFn(container);
}
