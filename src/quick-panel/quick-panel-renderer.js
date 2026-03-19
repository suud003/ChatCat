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
        this._mode = data.mode;
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.remove('active');
          if (b.dataset.mode === this._mode) b.classList.add('active');
        });
        
        this._resultArea.innerHTML = this._escapeHtml(data.result);
        this._resultArea.classList.add('visible');
        this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
        this._addCopyHandler();
        this._addFeedbackButtons();
        this._scheduleReportPanelSize();
    });
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = btn.dataset.mode;
        
        if (this._mode === 'screenshot') {
          if (window.qpAPI.startScreenshot) {
             window.qpAPI.startScreenshot();
          }
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
            // 提取 base64 (去掉 data:image/xxx;base64, 前缀)
            const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            this._pastedImageBase64 = base64;
            
            // 在输入框显示图片预览
            const previewEl = document.getElementById('paste-image-preview');
            if (previewEl) {
              previewEl.innerHTML = `
                <img src="${dataUrl}" style="max-width:100%;max-height:80px;border-radius:6px;margin-bottom:4px;">
                <span style="font-size:11px;color:#888;cursor:pointer;" id="remove-pasted-image">✕ 移除图片</span>
              `;
              previewEl.style.display = 'block';
              document.getElementById('remove-pasted-image')?.addEventListener('click', () => {
                this._pastedImageBase64 = null;
                previewEl.innerHTML = '';
                previewEl.style.display = 'none';
              });
            }
            
            // 自动切换到识图模式
            document.querySelectorAll('.mode-btn').forEach(b => {
              b.classList.remove('active');
              if (b.dataset.mode === 'screenshot') b.classList.add('active');
            });
            this._mode = 'screenshot';
            this._statusBar.textContent = '📸 已粘贴图片 · 点击发送识别';
          };
          reader.readAsDataURL(file);
          return; // 只处理第一张图片
        }
      }
    });
    
    window.qpAPI.onStreamChunk((chunk) => {
      this._resultArea.classList.add('visible');
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += this._escapeHtml(chunk) + '<span class="streaming-cursor"></span>';
      this._resultArea.scrollTop = this._resultArea.scrollHeight;
      this._scheduleReportPanelSize();
    });
    
    window.qpAPI.onStreamEnd((result) => {
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._isProcessing = false;
      
      // 检查是否有实际内容返回
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
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += `<div style="color:#e53935;">❌ ${err}</div>`;
      this._isProcessing = false;
      this._scheduleReportPanelSize();
    });

    // 外部自动传入图片识别（从猫咪气泡触发）
    window.qpAPI.onAutoRecognizeImage?.((data) => {
      // 在预览区显示图片
      const previewEl = document.getElementById('paste-image-preview');
      if (previewEl && data.dataUrl) {
        previewEl.innerHTML = `
          <img src="${data.dataUrl}" style="max-width:100%;max-height:80px;border-radius:6px;margin-bottom:4px;">
          <span style="font-size:11px;color:#888;">🔍 自动识别中...</span>
        `;
        previewEl.style.display = 'block';
      }
      
      // 切换到识图模式
      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.mode === 'screenshot') b.classList.add('active');
      });
      this._mode = 'screenshot';
      this._statusBar.textContent = '⏳ 正在自动识别剪贴板图片...';
      this._scheduleReportPanelSize();
    });

    // Keep BrowserWindow tightly fit to visible panel size.
    const ro = new ResizeObserver(() => this._scheduleReportPanelSize());
    if (this._panelEl) ro.observe(this._panelEl);
    this._scheduleReportPanelSize();
  }
  
  async _send() {
    if (this._isProcessing) return;
    
    const text = this._inputArea.textContent.trim();
    // 有粘贴图片或处于识图模式时，允许空文本发送
    if (!text && this._mode !== 'screenshot' && !this._pastedImageBase64) return;
    
    this._isProcessing = true;
    this._historyVisible = false;
    this._resultArea.innerHTML = '<span class="streaming-cursor"></span>';
    this._resultArea.classList.add('visible');
    this._statusBar.textContent = '⏳ 处理中...';
    
    try {
      if (this._mode === 'screenshot' || this._pastedImageBase64) {
        if (this._pastedImageBase64) {
          // 有粘贴的图片，直接识别
          const base64 = this._pastedImageBase64;
          this._pastedImageBase64 = null;
          const previewEl = document.getElementById('paste-image-preview');
          if (previewEl) { previewEl.innerHTML = ''; previewEl.style.display = 'none'; }
          try {
            await window.qpAPI.recognizeImage(base64);
          } catch(e) {
            // 错误已通过 qp-display-direct-result 展示
          }
          this._isProcessing = false;
        } else if (window.qpAPI.startScreenshot) {
          this._isProcessing = false;
          window.qpAPI.startScreenshot();
        }
        return;
      } else if (this._mode === 'ask') {
        this._qaHistory.push({ role: 'user', content: text });
        if (this._qaHistory.length > 20) {
          this._qaHistory = this._qaHistory.slice(-20);
        }
        await window.qpAPI.askQuestion(text, this._qaHistory);
      } else {
        await window.qpAPI.processText(this._mode, text);
      }
    } catch (err) {
      this._resultArea.innerHTML = `<div style="color:#e53935;">❌ ${err.message}</div>`;
      this._isProcessing = false;
    }
  }
  
  async _showHistory() {
    // Toggle: if history is already showing, hide it
    if (this._historyVisible) {
      this._resultArea.innerHTML = '';
      this._resultArea.classList.remove('visible');
      this._historyVisible = false;
      return;
    }

    const history = await window.qpAPI.getHistory();
    if (!history || history.length === 0) {
      this._resultArea.innerHTML = '<div style="color:#aaa;">暂无历史记录</div>';
      this._resultArea.classList.add('visible');
      this._historyVisible = true;
      return;
    }
    
    let html = '<div style="font-size:12px;"><strong><img src="../icons/tab-clipboard.png" style="width:14px;height:14px;vertical-align:middle;" alt=""> 最近处理记录</strong></div>';
    for (const item of history.slice(-10).reverse()) {
      const modeLabels = { polish: '<img src="../icons/qp-polish.png" style="width:12px;height:12px;vertical-align:middle;">', summarize: '<img src="../icons/qp-summarize.png" style="width:12px;height:12px;vertical-align:middle;">', explain: '<img src="../icons/qp-explain.png" style="width:12px;height:12px;vertical-align:middle;">', ask: '<img src="../icons/qp-ask.png" style="width:12px;height:12px;vertical-align:middle;">', ocr: '<img src="../icons/qp-screenshot.png" style="width:12px;height:12px;vertical-align:middle;">' };
      const time = new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const preview = (item.result || '').slice(0, 60).replace(/\n/g, ' ');
      html += `<div style="margin:4px 0;padding:6px;background:#f5f5f7;border-radius:6px;font-size:11px;cursor:pointer;" data-idx="${item.timestamp}">
        ${modeLabels[item.mode] || '📝'} <span style="color:#888;">${time}</span> ${preview}...
      </div>`;
    }
    this._resultArea.innerHTML = html;
    this._resultArea.classList.add('visible');
    this._historyVisible = true;
  }
  
  _addCopyHandler() {
    this._resultArea.style.cursor = 'pointer';
    this._resultArea.onclick = (e) => {
      // 如果点击的是反馈按钮区域，不触发复制
      if (e.target.closest('.feedback-actions')) return;
      
      // 只复制 AI 结果内容，排除反馈按钮的文字
      const clone = this._resultArea.cloneNode(true);
      const feedbackEl = clone.querySelector('.feedback-actions');
      if (feedbackEl) feedbackEl.remove();
      const text = clone.textContent.trim();
      
      if (!text) {
        this._statusBar.textContent = '⚠️ 没有可复制的内容';
        setTimeout(() => { this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送'; }, 2000);
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
    
    this._resultArea.querySelector('#btn-feedback-up').onclick = (e) => { e.stopPropagation(); this._sendFeedback(1); };
    this._resultArea.querySelector('#btn-feedback-down').onclick = (e) => { e.stopPropagation(); this._sendFeedback(-1); };
    this._resultArea.querySelector('#btn-feedback-retry').onclick = (e) => { 
        e.stopPropagation(); 
        if(this._mode !== 'screenshot') {
            this._send();
        } else {
            this._resultArea.innerHTML = '<span class="streaming-cursor"></span>';
            this._statusBar.textContent = '⏳ 准备截图...';
            window.qpAPI.startScreenshot();
        }
    };
  }

  _sendFeedback(rating) {
      if(window.qpAPI.sendFeedback) {
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
    const rect = this._panelEl.getBoundingClientRect();
    const contentHeight = Math.ceil(rect.height + 20); // include body margin
    if (!Number.isFinite(contentHeight)) return;
    if (Math.abs(contentHeight - this._lastReportedHeight) < 2) return;
    this._lastReportedHeight = contentHeight;
    window.qpAPI.reportPanelSize({ height: contentHeight });
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

new QuickPanelUI();
