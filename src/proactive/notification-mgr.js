/**
 * Notification Manager - Multi-level notification delivery
 *
 * L0 Silent: Write to feedItems store only
 * L1 Micro badge: Show small dot indicator on cat
 * L2 Bubble: Show cat speech bubble (auto-shrink after 5s)
 * L3 Emphasized: Larger bubble with action buttons
 *
 * Tracks daily count and notification history.
 */

export class NotificationMgr {
  constructor() {
    this._dailyCount = 0;
    this._maxDaily = 8;
    this._todayDate = '';
    this._showBubbleFn = null;
    this._onDotChange = null;    // callback(visible: bool)
    this._onActionBubble = null; // callback(config) for L3
    this._onOpenChat = null;     // callback() — open chat panel on reply actions
    this._onBubbleReply = null;  // callback(userText, catMessage) — handle bubble inline reply
    this._onOpenTodoPanel = null; // callback() — open tools panel to todo tab
    this._triggerBus = null;     // Phase 3: TriggerBusRenderer
  }

  async init(showBubbleFn) {
    this._showBubbleFn = showBubbleFn;
    await this._loadDailyCount();
  }

  /**
   * Push a notification at the specified level.
   * @param {object} config - { id, sceneId, sceneName, level, message, actions, timestamp }
   * @returns {boolean} whether the notification was delivered
   */
  async push(config) {
    // Check daily limit
    await this._loadDailyCount();
    if (this._dailyCount >= this._maxDaily) {
      return false;
    }

    const notification = {
      ...config,
      timestamp: config.timestamp || Date.now(),
      delivered: true
    };

    // Record to feed
    await this._addToFeed(notification);

    // Record to history
    await this._addToHistory(notification);

    // Increment daily count
    this._dailyCount++;
    await this._saveDailyCount();

    // Deliver based on level
    switch (config.level) {
      case 'L0':
        // Silent — already recorded
        break;

      case 'L1':
        this._showDot(true);
        break;

      case 'L2':
        this._showBubble(config.message);
        this._saveToChatHistory(config.message, 'assistant');
        break;

      case 'L3':
        this._showActionBubble(config);
        this._saveToChatHistory(config.message, 'assistant');
        break;

      default:
        this._showBubble(config.message);
    }

    return true;
  }

  // --- Delivery Methods ---

  _showDot(visible) {
    const dot = document.getElementById('proactive-dot');
    if (dot) {
      dot.classList.toggle('hidden', !visible);
    }
    if (this._onDotChange) this._onDotChange(visible);
  }

  _showBubble(message, duration = 5000) {
    if (this._showBubbleFn) {
      this._showBubbleFn(message, duration);
    }
    // Auto-shrink: after 5s, show dot
    setTimeout(() => {
      this._showDot(true);
    }, duration);
  }

  _showActionBubble(config) {
    const bubble = document.getElementById('cat-bubble');
    if (!bubble) return;

    // Clear existing
    bubble.classList.remove('hidden', 'fade-out', 'bubble-l3');
    bubble.innerHTML = '';

    // Title + message
    const msgEl = document.createElement('div');
    msgEl.className = 'bubble-message';
    msgEl.textContent = config.message;
    bubble.appendChild(msgEl);

    // Action buttons (filter out 'reply' actions — inline input handles replies)
    const nonReplyActions = (config.actions || []).filter(
      a => a.action !== 'reply' && a.action !== 'reply-onboarding'
    );
    const hasAnyActions = config.actions && config.actions.length > 0;

    if (hasAnyActions) {
      bubble.classList.add('bubble-l3');
      const actionsEl = document.createElement('div');
      actionsEl.className = 'bubble-actions';

      for (const act of nonReplyActions) {
        const btn = document.createElement('button');
        btn.className = 'bubble-action-btn';
        btn.textContent = act.label;
        btn.addEventListener('click', () => {
          this._handleAction(config, act.action);
          // Don't hide bubble for extract-todo (managed by _handleAction)
          if (act.action !== 'extract-todo') {
            this._hideBubble(bubble);
          }
        });
        actionsEl.appendChild(btn);
      }

      // Always add a dismiss/ignore button if none exists
      const hasDismiss = nonReplyActions.some(a => a.action === 'dismiss' || a.action === 'snooze');
      if (!hasDismiss) {
        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'bubble-action-btn bubble-dismiss-btn';
        dismissBtn.textContent = '忽略';
        dismissBtn.addEventListener('click', () => {
          this._handleAction(config, 'dismiss');
          this._hideBubble(bubble);
        });
        actionsEl.appendChild(dismissBtn);
      }

      if (actionsEl.children.length > 0) {
        bubble.appendChild(actionsEl);
      }

      // Inline reply input
      const inputRow = document.createElement('div');
      inputRow.className = 'bubble-input-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'bubble-reply-input';
      input.placeholder = '回复猫猫...';
      const sendBtn = document.createElement('button');
      sendBtn.className = 'bubble-reply-send';
      sendBtn.textContent = '发送';
      const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        this._saveToChatHistory(text, 'user');
        if (this._onBubbleReply) {
          this._onBubbleReply(text, config.message);
        }
        this._hideBubble(bubble);
      };
      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSend();
      });
      inputRow.appendChild(input);
      inputRow.appendChild(sendBtn);
      bubble.appendChild(inputRow);
    }

    // Clear timers
    if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
    if (bubble._removeTimer) clearTimeout(bubble._removeTimer);

    // L3 stays until user clicks, auto-dismiss after 10s then 2s fade
    bubble._hideTimer = setTimeout(() => {
      this._hideBubble(bubble);
    }, 10000);
  }

  _hideBubble(bubble) {
    if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
    bubble.classList.add('fade-out');
    setTimeout(() => {
      bubble.classList.add('hidden');
      bubble.classList.remove('fade-out', 'bubble-l3');
      bubble.innerHTML = '';
      bubble.textContent = '';
    }, 2000);
  }

  async _handleAction(config, action) {
    // Record user response
    const history = await window.electronAPI.getStore('proactiveHistory') || [];
    const entry = history.find(h => h.timestamp === config.timestamp);
    if (entry) {
      entry.userResponse = action;
      entry.respondedAt = Date.now();
      await window.electronAPI.setStore('proactiveHistory', history);
    }

    // Save user action to chat history
    const actLabel = config.actions?.find(a => a.action === action)?.label || action;
    await this._saveToChatHistory(actLabel, 'user');

    // Open chat panel for reply actions
    if (action.startsWith('reply') && this._onOpenChat) {
      this._onOpenChat();
    }

    // Trigger todo extraction with progress display
    if (action === 'extract-todo') {
      const bubble = document.getElementById('cat-bubble');
      if (bubble) {
        // Show progress in bubble
        bubble.innerHTML = '';
        const progressMsg = document.createElement('div');
        progressMsg.className = 'bubble-message';
        progressMsg.textContent = '🔄 猫猫正在帮你整理待办...';
        bubble.appendChild(progressMsg);
        if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
      }

      try {
        let result;
        if (this._triggerBus) {
          // Phase 3: Route through TriggerBus
          const trigger = {
            type: 'skill',
            sceneId: 'skill.todo-management',
            payload: {
              skillId: 'todo-management',
              userContext: { userMessage: '/todo' },
              userMessage: '/todo',
            },
          };
          const busResult = await this._triggerBus.submitAndWait(trigger, { priority: 'NORMAL' });
          if (busResult.status === 'completed') {
            result = { success: true, output: busResult.result };
          } else {
            throw new Error(busResult.error || 'Failed');
          }
        } else {
          // Legacy fallback
          result = await window.electronAPI.skillExecute('todo-management', { userMessage: '/todo' });
        }
        const count = result?.todosAdded || 0;

        if (bubble) {
          bubble.innerHTML = '';
          const doneMsg = document.createElement('div');
          doneMsg.className = 'bubble-message';
          doneMsg.textContent = `✅ 已提取 ${count} 条待办！`;
          bubble.appendChild(doneMsg);

          // Add clickable link to open todo panel
          const link = document.createElement('div');
          link.className = 'bubble-actions';
          const linkBtn = document.createElement('button');
          linkBtn.className = 'bubble-action-btn';
          linkBtn.textContent = '📋 查看待办';
          linkBtn.addEventListener('click', () => {
            if (this._onOpenTodoPanel) this._onOpenTodoPanel();
            this._hideBubble(bubble);
          });
          link.appendChild(linkBtn);
          bubble.appendChild(link);

          // Auto-hide after 5 seconds
          bubble._hideTimer = setTimeout(() => {
            this._hideBubble(bubble);
          }, 5000);
        }
      } catch (err) {
        console.warn('[NotificationMgr] extract-todo failed:', err);
        if (bubble) {
          bubble.innerHTML = '';
          const errMsg = document.createElement('div');
          errMsg.className = 'bubble-message';
          errMsg.textContent = '❌ 提取失败了，稍后再试吧~';
          bubble.appendChild(errMsg);
          bubble._hideTimer = setTimeout(() => {
            this._hideBubble(bubble);
          }, 3000);
        }
      }
      return; // Don't hide bubble — managed above
    }
  }

  // --- Persistence ---

  async _loadDailyCount() {
    const today = new Date().toISOString().split('T')[0];
    if (this._todayDate !== today) {
      this._todayDate = today;
      this._dailyCount = 0;
      // Count today's entries from history
      const history = await window.electronAPI.getStore('proactiveHistory') || [];
      this._dailyCount = history.filter(h => {
        const d = new Date(h.timestamp).toISOString().split('T')[0];
        return d === today;
      }).length;
    }
  }

  async _saveDailyCount() {
    // Count is derived from history, no separate storage needed
  }

  async _addToFeed(notification) {
    const feed = await window.electronAPI.getStore('feedItems') || [];
    feed.unshift({
      sceneId: notification.sceneId,
      sceneName: notification.sceneName,
      message: notification.message,
      level: notification.level,
      timestamp: notification.timestamp,
      read: false
    });
    // Keep last 50 feed items
    if (feed.length > 50) feed.length = 50;
    await window.electronAPI.setStore('feedItems', feed);
  }

  async _addToHistory(notification) {
    const history = await window.electronAPI.getStore('proactiveHistory') || [];
    history.unshift({
      sceneId: notification.sceneId,
      sceneName: notification.sceneName,
      level: notification.level,
      message: notification.message,
      timestamp: notification.timestamp,
      userResponse: null,
      respondedAt: null
    });
    // Keep last 200 history entries
    if (history.length > 200) history.length = 200;
    await window.electronAPI.setStore('proactiveHistory', history);
  }

  // --- Configuration ---

  setMaxDaily(max) {
    this._maxDaily = max;
  }

  clearDot() {
    this._showDot(false);
  }

  // --- Chat History ---

  async _saveToChatHistory(content, role) {
    const history = await window.electronAPI.getStore('chatHistory') || [];
    history.push({ role, content });
    if (history.length > 40) history.splice(0, history.length - 20);
    await window.electronAPI.setStore('chatHistory', history);
  }

  set onDotChange(fn) { this._onDotChange = fn; }
  set onOpenChat(fn) { this._onOpenChat = fn; }
  set onBubbleReply(fn) { this._onBubbleReply = fn; }
  set onOpenTodoPanel(fn) { this._onOpenTodoPanel = fn; }

  /**
   * Phase 3: Set TriggerBusRenderer for skill execution.
   * @param {import('../ai-runtime/trigger-bus-renderer.js').TriggerBusRenderer} triggerBus
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }
}
