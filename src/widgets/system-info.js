/**
 * System Info Widget - displays time, CPU, and memory usage
 */

export class SystemInfoWidget {
  constructor() {
    this.container = document.getElementById('widget-container');
    this.infoEl = document.getElementById('system-info');
    this.isVisible = false;
    this.cpuUsage = 0;
    this.lastCpuTimes = null;

    this.container.classList.add('hidden');
    this.update();
    setInterval(() => this.update(), 2000);
  }

  async update() {
    try {
      const info = await window.electronAPI.getSystemInfo();

      // Calculate CPU usage
      const cpuUsage = this.calculateCpuUsage(info.cpus);

      // Memory usage
      const usedMem = info.totalMem - info.freeMem;
      const memPercent = ((usedMem / info.totalMem) * 100).toFixed(1);
      const memGB = (usedMem / (1024 ** 3)).toFixed(1);
      const totalGB = (info.totalMem / (1024 ** 3)).toFixed(1);

      // Time
      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });

      this.infoEl.innerHTML = `
        <div class="time">${timeStr}</div>
        <div style="font-size:10px; color:rgba(255,255,255,0.5); margin-bottom:6px;">${dateStr}</div>
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
        <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:2px;">
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
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('hidden', !this.isVisible);
  }
}
