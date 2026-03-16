/**
 * Leaderboard UI — renders into Fun panel "排行" tab.
 * ES module for renderer process.
 */

export class LeaderboardUI {
  /**
   * @param {import('./mp-client.js').MultiplayerClient} client
   */
  constructor(client) {
    this._client = client;
    this._container = document.getElementById('tab-fun-leaderboard');
    this._currentSort = 'affinity';
    this._entries = [];

    if (!this._container) return;

    this._render();
    this._bindEvents();
    this._bindClientCallback();
  }

  _render() {
    this._container.innerHTML = `
      <div class="mp-leaderboard">
        <div class="lb-sort-row">
          <span class="lb-sort-label">排序:</span>
          <button class="lb-sort-btn active" data-sort="affinity">🐱 猫猫币</button>
          <button class="lb-sort-btn" data-sort="level">⭐ 等级</button>
          <button class="lb-sort-btn" data-sort="rebirthCount">❤️ 转生</button>
          <button id="lb-refresh" class="lb-sort-btn">🔄</button>
        </div>
        <div id="lb-table-wrapper" class="lb-table-wrapper">
          <div class="lb-empty">连接服务器后查看排行榜</div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    // Sort buttons
    this._container.querySelectorAll('.lb-sort-btn[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentSort = btn.dataset.sort;
        this._container.querySelectorAll('.lb-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._client.requestLeaderboard(this._currentSort);
      });
    });

    // Refresh button
    this._container.querySelector('#lb-refresh')?.addEventListener('click', () => {
      this._client.requestLeaderboard(this._currentSort);
    });

    // Auto-request when tab becomes visible
    const tabBtn = document.querySelector('.panel-tab[data-tab="fun-leaderboard"]');
    tabBtn?.addEventListener('click', () => {
      if (this._client.isAuthenticated) {
        this._client.requestLeaderboard(this._currentSort);
      }
    });
  }

  _bindClientCallback() {
    const prevLeaderboard = this._client.onLeaderboard;
    this._client.onLeaderboard = (data) => {
      prevLeaderboard?.(data);
      this._entries = data.entries || [];
      this._renderTable();
    };
  }

  _renderTable() {
    const wrapper = this._container.querySelector('#lb-table-wrapper');
    if (!wrapper) return;

    if (this._entries.length === 0) {
      wrapper.innerHTML = '<div class="lb-empty">暂无数据</div>';
      return;
    }

    const currentUserId = this._client.userId;

    let html = `
      <table class="lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>用户</th>
            <th>等级</th>
            <th>猫猫币</th>
            <th>转生</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const entry of this._entries) {
      const isMe = entry.userId === currentUserId;
      const rowClass = isMe ? 'lb-row-me' : '';
      const onlineDot = entry.online ? '<span class="lb-online-dot"></span>' : '<span class="lb-offline-dot"></span>';

      html += `
        <tr class="${rowClass}">
          <td class="lb-rank">${this._rankBadge(entry.rank)}</td>
          <td class="lb-user">${onlineDot} ${this._escapeHtml(entry.username)}${isMe ? ' (我)' : ''}</td>
          <td>Lv.${entry.level}</td>
          <td>${this._formatNumber(entry.affinity)}</td>
          <td>${entry.rebirthCount}世</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    wrapper.innerHTML = html;
  }

  _rankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  }

  _formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Request leaderboard data (call when tab opens) */
  refresh() {
    if (this._client.isAuthenticated) {
      this._client.requestLeaderboard(this._currentSort);
    }
  }
}
