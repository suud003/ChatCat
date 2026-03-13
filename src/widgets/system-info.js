/**
 * System Info Widget - manga bubble with drag, maximize, close
 */

export class SystemInfoWidget {
  constructor() {
    this.container = document.getElementById('widget-container');
    this.bubble = document.getElementById('widget-bubble');
    this.header = document.getElementById('widget-bubble-header');
    this.body = document.getElementById('widget-body');
    this.infoEl = document.getElementById('system-info');
    this.closeBtn = document.getElementById('widget-close');
    this.maximizeBtn = document.getElementById('widget-maximize');

    this.isVisible = false;
    this.isMaximized = false;
    this.savedPosition = null;
    this.cpuUsage = 0;
    this.lastCpuTimes = null;
    this.positionFn = null;

    this.container.classList.add('hidden');
    this.setupEvents();
    this.setupDrag();
    this.update();
    setInterval(() => this.update(), 2000);
  }

  setupEvents() {
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    this.maximizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize();
    });
  }

  setupDrag() {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    this.header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      this.container.style.left = origLeft + 'px';
      this.container.style.top = origTop + 'px';
      this.container.style.bottom = 'auto';
      this.container.style.transform = 'none';
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

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    if (this.isMaximized) {
      this.savedPosition = {
        left: this.container.style.left,
        top: this.container.style.top,
        bottom: this.container.style.bottom,
        transform: this.container.style.transform
      };
      this.container.classList.add('maximized');
      this.maximizeBtn.textContent = '❐';
      this.maximizeBtn.title = 'Restore';
    } else {
      this.container.classList.remove('maximized');
      this.maximizeBtn.textContent = '□';
      this.maximizeBtn.title = 'Maximize';
      if (this.savedPosition) {
        this.container.style.left = this.savedPosition.left;
        this.container.style.top = this.savedPosition.top;
        this.container.style.bottom = this.savedPosition.bottom;
        this.container.style.transform = this.savedPosition.transform;
        this.savedPosition = null;
      }
    }
  }

  async update() {
    try {
      const info = await window.electronAPI.getSystemInfo();
      const cpuUsage = this.calculateCpuUsage(info.cpus);
      const usedMem = info.totalMem - info.freeMem;
      const memPercent = ((usedMem / info.totalMem) * 100).toFixed(1);
      const memGB = (usedMem / (1024 ** 3)).toFixed(1);
      const totalGB = (info.totalMem / (1024 ** 3)).toFixed(1);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });

      this.infoEl.innerHTML = `
        <div class="time">${timeStr}</div>
        <div style="font-size:10px; color:#aaa; margin-bottom:6px;">${dateStr}</div>
        <div class="stat">
          <span>CPU ${cpuUsage.toFixed(0)}%</span>
          <span>MEM ${memPercent}%</span>
        </div>
        <div style="display:flex; gap:4px;">
          <div class="stat-bar" style="flex:1">
            <div class="stat-bar-fill cpu" style="width:${cpuUsage}%"></div>
          </div>
          <div class="stat-bar" style="flex:1">
            <div class="stat-bar-fill mem" style="width:${memPercent}%"></div>
          </div>
        </div>
        <div style="font-size:10px; color:#aaa; margin-top:2px;">
          ${memGB}/${totalGB} GB
        </div>
      `;
    } catch (err) {
      console.warn('Failed to update system info:', err);
    }
  }

  calculateCpuUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    if (this.lastCpuTimes) {
      const idleDiff = totalIdle - this.lastCpuTimes.idle;
      const totalDiff = totalTick - this.lastCpuTimes.total;
      this.cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
    }

    this.lastCpuTimes = { idle: totalIdle, total: totalTick };
    return Math.max(0, Math.min(100, this.cpuUsage));
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    if (this.positionFn) this.positionFn(this.container);
  }

  hide() {
    this.isVisible = false;
    this.container.classList.add('hidden');
    if (this.isMaximized) {
      this.isMaximized = false;
      this.container.classList.remove('maximized');
      this.maximizeBtn.textContent = '□';
      this.maximizeBtn.title = 'Maximize';
      if (this.savedPosition) {
        this.container.style.left = this.savedPosition.left;
        this.container.style.top = this.savedPosition.top;
        this.container.style.bottom = this.savedPosition.bottom;
        this.container.style.transform = this.savedPosition.transform;
        this.savedPosition = null;
      }
    }
  }
}
