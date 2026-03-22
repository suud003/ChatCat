/**
 * Chat UI - Inline chat input below pet canvas
 * AI replies show in cat bubble; click bubble to expand history.
 * V2 Refactor: Removed panel/drag/maximize/settings logic.
 */

export class ChatUI {
  constructor(aiService, character, apiPresets) {
    this.aiService = aiService;
    this.character = character;
    this.apiPresets = apiPresets || {};
    this.isStreaming = false;

    // V1.1: optional hooks
    this._todoParser = null;
    this._onSentiment = null;
    this._skillRouter = null;
    this._onSettingsSaved = null;

    // Inline chat elements
    this.inputEl = document.getElementById('inline-chat-input');
    this.sendBtn = document.getElementById('inline-chat-send');
    this.responseEl = document.getElementById('inline-chat-response');
    this.inlineChatEl = document.getElementById('inline-chat');

    // Cat bubble (for showing latest AI reply)
    this.bubbleEl = document.getElementById('cat-bubble');

    this.setupEvents();
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
    this.addMessage(text, 'assistant');
    this._showBubbleText(text);
  }

  setupEvents() {
    this.sendBtn?.addEventListener('click', () => this.sendMessage());
    this.inputEl?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // History toggle button (left of input)
    this.historyBtn = document.getElementById('inline-chat-history');
    this.historyBtn?.addEventListener('click', () => {
      this._toggleHistory();
    });

    // Click on cat bubble to toggle history
    this.bubbleEl?.addEventListener('click', () => {
      this._toggleHistory();
    });

    // Toggle chat via IPC (legacy support)
    window.electronAPI.onToggleChat?.(() => {
      this.inlineChatEl?.classList.toggle('force-visible');
      this.inputEl?.focus();
    });

    // Open settings via IPC - now opens settings panel
    window.electronAPI.onOpenSettings?.(() => {
      const settingsPanel = document.getElementById('settings-container');
      if (settingsPanel) {
        settingsPanel.classList.remove('hidden');
      }
    });
  }

  async sendMessage() {
    const text = this.inputEl?.value?.trim();
    if (!text || this.isStreaming) return;

    if (text === '/clear') {
      this.aiService.clearHistory();
      if (this.responseEl) this.responseEl.innerHTML = '';
      this.inputEl.value = '';
      this._showBubbleText('聊天记录已清除！(=^.^=)');
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

    // Show streaming in bubble
    this._showBubbleStreaming();

    let fullResp = '';
    try {
      for await (const chunk of this.aiService.sendMessageStream(text)) {
        msgEl.textContent += chunk;
        fullResp += chunk;
        // Update bubble with latest content
        this._updateBubbleText(fullResp);
        this.scrollToBottom();
      }
    } catch (err) {
      console.error('[ChatUI] sendMessageStream failed:', err);
      msgEl.classList.add('error');
      msgEl.textContent = `错误：${err.message}`;
      this._showBubbleText(`😿 错误：${err.message}`);
    }

    this.isStreaming = false;

    // Show final reply in bubble (truncated)
    if (fullResp) {
      this._showBubbleText(fullResp.slice(0, 120) + (fullResp.length > 120 ? '...' : ''));
    }

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
    if (!this.responseEl) return document.createElement('div');
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.textContent = text;
    this.responseEl.appendChild(msgEl);
    this.scrollToBottom();
    return msgEl;
  }

  /**
   * Execute a matched skill: show waiting → call AI → save file → show link.
   */
  async _executeSkill(skillMeta, userText) {
    const waitEl = this.addMessage('⏳ 生成中，请稍候...', 'assistant');
    this._showBubbleText('⏳ 生成中，请稍候...');

    try {
      const { result } = await this._skillRouter.execute(skillMeta.name, userText);

      if (!result || !result.success) {
        waitEl.textContent = result?.output || '执行失败';
        waitEl.classList.add('error');
        this._showBubbleText(result?.output || '执行失败');
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
          this._showBubbleText(`✅ 日报已生成：${fileName}`);
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
      this._showBubbleText((result.output || '').slice(0, 100));
    } catch (err) {
      waitEl.textContent = `执行错误: ${err.message}`;
      waitEl.classList.add('error');
      this._showBubbleText(`😿 执行错误: ${err.message}`);
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
      .replace(/^\d+\. (.+)$/gm, (_, text) => `• ${text}`)
      .replace(/\n/g, '<br>');
  }

  scrollToBottom() {
    if (this.responseEl) {
      this.responseEl.scrollTop = this.responseEl.scrollHeight;
    }
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

  // ── Bubble helpers ──

  _showBubbleText(text) {
    if (!this.bubbleEl) return;
    this.bubbleEl.classList.remove('hidden', 'fade-out');
    this.bubbleEl.textContent = text;

    // Auto-hide after 10s
    if (this.bubbleEl._chatHideTimer) clearTimeout(this.bubbleEl._chatHideTimer);
    if (this.bubbleEl._chatRemoveTimer) clearTimeout(this.bubbleEl._chatRemoveTimer);
    this.bubbleEl._chatHideTimer = setTimeout(() => {
      this.bubbleEl.classList.add('fade-out');
      this.bubbleEl._chatRemoveTimer = setTimeout(() => {
        this.bubbleEl.classList.add('hidden');
        this.bubbleEl.classList.remove('fade-out');
      }, 2000);
    }, 10000);
  }

  _showBubbleStreaming() {
    if (!this.bubbleEl) return;
    this.bubbleEl.classList.remove('hidden', 'fade-out');
    this.bubbleEl.textContent = '💭 思考中...';
    // Clear any existing hide timer during streaming
    if (this.bubbleEl._chatHideTimer) clearTimeout(this.bubbleEl._chatHideTimer);
    if (this.bubbleEl._chatRemoveTimer) clearTimeout(this.bubbleEl._chatRemoveTimer);
  }

  _updateBubbleText(text) {
    if (!this.bubbleEl) return;
    // Show truncated streaming text in bubble
    const truncated = text.slice(0, 120) + (text.length > 120 ? '...' : '');
    this.bubbleEl.textContent = truncated;
  }

  _toggleHistory() {
    if (!this.responseEl) return;
    const isHidden = this.responseEl.classList.toggle('hidden');
    // Update history button active state
    if (this.historyBtn) {
      this.historyBtn.classList.toggle('active', !isHidden);
    }
    // Keep inline chat visible when history is open
    if (!isHidden) {
      this.inlineChatEl?.classList.add('force-visible');
      this._ensureClearButton();
      this.scrollToBottom();
    } else {
      this.inlineChatEl?.classList.remove('force-visible');
      this.inputEl?.blur();
    }
  }

  /**
   * Add a "clear history" button at the top of chat history panel.
   */
  _ensureClearButton() {
    if (!this.responseEl) return;
    // Don't add duplicate
    if (this.responseEl.querySelector('.chat-clear-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'chat-clear-btn';
    btn.textContent = '🗑️ 清除记录';
    btn.addEventListener('click', () => {
      this.aiService.clearHistory();
      // Remove all messages but keep the clear button
      const messages = this.responseEl.querySelectorAll('.chat-message');
      messages.forEach(el => el.remove());
      this._showBubbleText('聊天记录已清除！(=^.^=)');
    });
    this.responseEl.prepend(btn);
  }
}
