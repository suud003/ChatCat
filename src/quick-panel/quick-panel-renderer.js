class QuickPanelUI {
  constructor() {
    this._mode = 'polish';
    this._qaHistory = [];
    this._isProcessing = false;
    this._historyVisible = false;

    this._inputArea = document.getElementById('input-area');
    this._resultArea = document.getElementById('result-area');
    this._statusBar = document.getElementById('status-bar');
    this._panelEl = document.querySelector('.panel');
    this._previewEl = document.getElementById('paste-image-preview');
    this._lastReportedHeight = 0;
    this._resizeRaf = 0;

    this._init();
  }

  _init() {
    window.qpAPI.onPanelShow((data) => {
      if (data.clipboardText && !this._inputArea.textContent.trim()) {
        this._inputArea.textContent = data.clipboardText;
      }
      this._inputArea.focus();
      if (this._inputArea.textContent) {
        const range = document.createRange();
        range.selectNodeContents(this._inputArea);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this._scheduleReportPanelSize();
    });

    window.qpAPI.onDisplayDirectResult((data) => {
      this._historyVisible = false;
      this._mode = data.mode;
      this._syncModeButtons();

      this._resultArea.innerHTML = this._escapeHtml(data.result);
      this._setResultVisible(true);
      this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
      this._addCopyHandler();
      this._addFeedbackButtons();
      this._scheduleReportPanelSize();
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prevMode = this._mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = btn.dataset.mode;

        // --- 模式切换时的状态重置 ---

        // 清空上一次结果
        this._resultArea.innerHTML = '';
        this._setResultVisible(false);
        this._historyVisible = false;

        // 离开 ask 模式时清空对话历史
        if (prevMode === 'ask' && this._mode !== 'ask') {
          this._qaHistory = [];
        }

        // 离开识图模式 或 从识图切到非识图，清除图片预览
        if (prevMode === 'screenshot' && this._mode !== 'screenshot') {
          this._pastedImageBase64 = null;
          this._clearPreview();
        }

        // 重置状态栏
        this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送';

        if (this._mode === 'screenshot' && window.qpAPI.startScreenshot) {
          window.qpAPI.startScreenshot();
        }
        this._scheduleReportPanelSize();
      });
    });

    document.getElementById('btn-send').addEventListener('click', () => this._send());
    document.getElementById('btn-close').addEventListener('click', () => window.qpAPI.close());
    document.getElementById('btn-history').addEventListener('click', () => this._showHistory());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.qpAPI.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this._send();
      }
    });

    this._inputArea.addEventListener('input', () => this._scheduleReportPanelSize());

    // 粘贴图片支持
    this._pastedImageBase64 = null;
    this._inputArea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            this._pastedImageBase64 = base64;

            this._showPreview(`
              <img src="${dataUrl}" style="max-width:100%;max-height:80px;border-radius:6px;margin-bottom:4px;">
              <span style="font-size:11px;color:#888;cursor:pointer;" id="remove-pasted-image">✕ 移除图片</span>
            `);
            document.getElementById('remove-pasted-image')?.addEventListener('click', () => {
              this._pastedImageBase64 = null;
              this._clearPreview();
            });

            document.querySelectorAll('.mode-btn').forEach(b => {
              b.classList.remove('active');
              if (b.dataset.mode === 'screenshot') b.classList.add('active');
            });
            this._mode = 'screenshot';
            this._statusBar.textContent = '📸 已粘贴图片 · 点击发送识别';
            this._scheduleReportPanelSize();
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    });

    window.qpAPI.onStreamChunk((chunk) => {
      this._historyVisible = false;
      this._setResultVisible(true);
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += this._escapeHtml(chunk) + '<span class="streaming-cursor"></span>';
      this._resultArea.scrollTop = this._resultArea.scrollHeight;
      this._scheduleReportPanelSize();
    });

    window.qpAPI.onStreamEnd((result) => {
      this._historyVisible = false;
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._isProcessing = false;

      if (!result || !result.trim()) {
        this._resultArea.innerHTML = '<div style="color:#e53935;">⚠️ AI 未返回任何内容。可能原因：\n• 当前模型不支持该请求类型\n• API 配额已用尽\n• 请求被服务端过滤\n请检查设置中的 API 配置和模型选择。</div>';
        this._statusBar.textContent = '⚠️ 未收到有效结果';
      } else {
        this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
      }

      if (this._mode === 'ask' && result) {
        this._qaHistory.push({ role: 'assistant', content: result });
      }

      this._addCopyHandler();
      this._addFeedbackButtons();
      this._scheduleReportPanelSize();
    });

    window.qpAPI.onStreamError((err) => {
      this._historyVisible = false;
      this._setResultVisible(true);
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += `<div style="color:#e53935;">❌ ${err}</div>`;
      this._isProcessing = false;
      this._scheduleReportPanelSize();
    });

    // 从猫咪气泡接收剪贴板图片（仅显示预览，用户需手动点击"发送"或"开始识别"）
    window.qpAPI.onAutoRecognizeImage?.((data) => {
      this._historyVisible = false;
      this._pastedImageBase64 = data.base64;  // 保存 base64 供 _send() 使用
      
      if (this._previewEl && data.dataUrl) {
        this._showPreview(`
          <img src="${data.dataUrl}" style="max-width:100%;max-height:80px;border-radius:6px;margin-bottom:4px;">
          <span style="font-size:11px;color:#888;cursor:pointer;" id="remove-auto-image">✕ 移除图片</span>
        `);
        
        // 添加移除按钮事件
        document.getElementById('remove-auto-image')?.addEventListener('click', () => {
          this._pastedImageBase64 = null;
          this._clearPreview();
        });
      }

      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.mode === 'screenshot') b.classList.add('active');
      });
      this._mode = 'screenshot';
      this._statusBar.textContent = '📸 已接收剪贴板图片 · 点击"发送"开始识别';
      this._scheduleReportPanelSize();
    });

    const ro = new ResizeObserver(() => this._scheduleReportPanelSize());
    [this._panelEl, this._inputArea, this._resultArea, this._previewEl].filter(Boolean).forEach(el => ro.observe(el));
    this._scheduleReportPanelSize();
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
    this._scheduleReportPanelSize();

    try {
      if (this._mode === 'screenshot' || this._pastedImageBase64) {
        if (this._pastedImageBase64) {
          const base64 = this._pastedImageBase64;
          // 保留缩略图，更新状态为 "识别中"
          this._updatePreviewStatus('recognizing');
          try {
            await window.qpAPI.recognizeImage(base64);
            // 识别完成，更新缩略图状态
            this._updatePreviewStatus('done');
          } catch (e) {
            // 错误已通过 qp-display-direct-result 展示
            this._updatePreviewStatus('done');
          }
          this._pastedImageBase64 = null;
          this._isProcessing = false;
          this._scheduleReportPanelSize();
        } else if (window.qpAPI.startScreenshot) {
          this._isProcessing = false;
          this._scheduleReportPanelSize();
          window.qpAPI.startScreenshot();
        }
        return;
      }

      if (this._mode === 'ask') {
        this._qaHistory.push({ role: 'user', content: text });
        if (this._qaHistory.length > 20) {
          this._qaHistory = this._qaHistory.slice(-20);
        }
        await window.qpAPI.askQuestion(text, this._qaHistory);
        return;
      }

      await window.qpAPI.processText(this._mode, text);
    } catch (err) {
      this._resultArea.innerHTML = `<div style="color:#e53935;">❌ ${err.message}</div>`;
      this._setResultVisible(true);
      this._isProcessing = false;
      this._scheduleReportPanelSize();
    }
  }

  async _showHistory() {
    if (this._historyVisible) {
      this._resultArea.innerHTML = '';
      this._setResultVisible(false);
      this._historyVisible = false;
      this._scheduleReportPanelSize();
      return;
    }

    const history = await window.qpAPI.getHistory();
    if (!history || history.length === 0) {
      this._resultArea.innerHTML = '<div style="color:#aaa;">暂无历史记录</div>';
      this._setResultVisible(true);
      this._historyVisible = true;
      this._scheduleReportPanelSize();
      return;
    }

    let html = '<div style="font-size:12px;"><strong><img src="../icons/tab-clipboard.png" style="width:14px;height:14px;vertical-align:middle;" alt=""> 最近处理记录</strong></div>';
    for (const item of history.slice(-10).reverse()) {
      const modeLabels = {
        polish: '<img src="../icons/qp-polish.png" style="width:12px;height:12px;vertical-align:middle;">',
        summarize: '<img src="../icons/qp-summarize.png" style="width:12px;height:12px;vertical-align:middle;">',
        explain: '<img src="../icons/qp-explain.png" style="width:12px;height:12px;vertical-align:middle;">',
        ask: '<img src="../icons/qp-ask.png" style="width:12px;height:12px;vertical-align:middle;">',
        ocr: '<img src="../icons/qp-screenshot.png" style="width:12px;height:12px;vertical-align:middle;">'
      };
      const time = new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const preview = (item.result || '').slice(0, 60).replace(/\n/g, ' ');
      html += `<div style="margin:4px 0;padding:6px;background:#f5f5f7;border-radius:6px;font-size:11px;cursor:pointer;" data-idx="${item.timestamp}">
        ${modeLabels[item.mode] || '📝'} <span style="color:#888;">${time}</span> ${preview}...
      </div>`;
    }
    this._resultArea.innerHTML = html;
    this._setResultVisible(true);
    this._historyVisible = true;
    this._scheduleReportPanelSize();
  }

  _addCopyHandler() {
    this._resultArea.style.cursor = 'pointer';
    this._resultArea.onclick = (e) => {
      if (e.target.closest('.feedback-actions')) return;

      const clone = this._resultArea.cloneNode(true);
      const feedbackEl = clone.querySelector('.feedback-actions');
      if (feedbackEl) feedbackEl.remove();
      const text = clone.textContent.trim();

      if (!text) {
        this._statusBar.textContent = '⚠️ 没有可复制的内容';
        setTimeout(() => {
          this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送';
        }, 2000);
        return;
      }

      window.qpAPI.copyToClipboard(text);
      this._statusBar.textContent = '📋 已复制到剪贴板';
      setTimeout(() => {
        this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送';
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
    feedbackDiv.style.marginTop = '10px';
    feedbackDiv.style.paddingTop = '10px';
    feedbackDiv.style.borderTop = '1px dashed #e8e8ec';
    feedbackDiv.style.display = 'flex';
    feedbackDiv.style.gap = '8px';

    feedbackDiv.innerHTML = `
      <button class="action-btn secondary" id="btn-feedback-up" style="font-size: 11px; padding: 4px 10px;">👍 有用</button>
      <button class="action-btn secondary" id="btn-feedback-down" style="font-size: 11px; padding: 4px 10px;">👎 不好</button>
      <button class="action-btn secondary" id="btn-feedback-retry" style="font-size: 11px; padding: 4px 10px;">🔄 重试</button>
    `;

    this._resultArea.appendChild(feedbackDiv);

    this._resultArea.querySelector('#btn-feedback-up').onclick = (e) => {
      e.stopPropagation();
      this._sendFeedback(1);
    };
    this._resultArea.querySelector('#btn-feedback-down').onclick = (e) => {
      e.stopPropagation();
      this._sendFeedback(-1);
    };
    this._resultArea.querySelector('#btn-feedback-retry').onclick = (e) => {
      e.stopPropagation();
      if (this._mode !== 'screenshot') {
        this._send();
      } else {
        this._historyVisible = false;
        this._resultArea.innerHTML = '<span class="streaming-cursor"></span>';
        this._setResultVisible(true);
        this._statusBar.textContent = '⏳ 准备截图...';
        this._scheduleReportPanelSize();
        window.qpAPI.startScreenshot();
      }
    };

    this._scheduleReportPanelSize();
  }

  _sendFeedback(rating) {
    if (window.qpAPI.sendFeedback) {
      window.qpAPI.sendFeedback({ mode: this._mode, rating, timestamp: Date.now() });
      this._statusBar.textContent = '✅ 感谢反馈！';
    }
  }

  _scheduleReportPanelSize() {
    if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = 0;
      this._reportPanelSize();
    });
  }

  _reportPanelSize() {
    if (!this._panelEl || !window.qpAPI?.reportPanelSize) return;

    const bodyStyles = window.getComputedStyle(document.body);
    const verticalPadding = (parseFloat(bodyStyles.paddingTop) || 0) + (parseFloat(bodyStyles.paddingBottom) || 0);
    const contentHeight = Math.ceil(Math.max(this._panelEl.scrollHeight, this._panelEl.offsetHeight) + verticalPadding);
    if (!Number.isFinite(contentHeight)) return;
    if (Math.abs(contentHeight - this._lastReportedHeight) < 2) return;

    this._lastReportedHeight = contentHeight;
    window.qpAPI.reportPanelSize({ height: contentHeight });
  }

  _setResultVisible(visible) {
    this._resultArea.classList.toggle('visible', visible);
    this._panelEl?.classList.toggle('has-result', visible);
    if (!visible) {
      this._resultArea.onclick = null;
      this._resultArea.style.cursor = '';
    }
  }

  _showPreview(html) {
    if (!this._previewEl) return;
    this._previewEl.innerHTML = html;
    this._previewEl.classList.add('visible');
    this._scheduleReportPanelSize();
  }

  _clearPreview() {
    if (!this._previewEl) return;
    this._previewEl.innerHTML = '';
    this._previewEl.classList.remove('visible');
    this._scheduleReportPanelSize();
  }

  /**
   * 更新缩略图预览区的识别状态
   * @param {'recognizing'|'done'} status
   */
  _updatePreviewStatus(status) {
    if (!this._previewEl) return;
    const statusEl = this._previewEl.querySelector('.preview-status');
    const removeBtn = this._previewEl.querySelector('#remove-pasted-image, #remove-auto-image');

    if (status === 'recognizing') {
      // 隐藏移除按钮，显示识别中状态
      if (removeBtn) removeBtn.style.display = 'none';
      if (statusEl) {
        statusEl.textContent = '⏳ 正在识别...';
        statusEl.style.color = '#f5a623';
      } else {
        const span = document.createElement('span');
        span.className = 'preview-status';
        span.style.cssText = 'display:block;font-size:11px;color:#f5a623;margin-top:2px;';
        span.textContent = '⏳ 正在识别...';
        this._previewEl.appendChild(span);
      }
    } else if (status === 'done') {
      if (statusEl) {
        statusEl.textContent = '✓ 已识别';
        statusEl.style.color = '#4caf50';
      }
      // 显示手动关闭按钮
      if (removeBtn) {
        removeBtn.textContent = '✕ 关闭预览';
        removeBtn.style.display = '';
        // 重新绑定点击事件 (移除旧的)
        const newBtn = removeBtn.cloneNode(true);
        removeBtn.parentNode.replaceChild(newBtn, removeBtn);
        newBtn.addEventListener('click', () => {
          this._pastedImageBase64 = null;
          this._clearPreview();
        });
      }
    }
    this._scheduleReportPanelSize();
  }

  _syncModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this._mode);
    });
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

new QuickPanelUI();
