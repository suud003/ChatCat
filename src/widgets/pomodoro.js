/**
 * Pomodoro Timer widget.
 *
 * Standard 25-min work / 5-min break cycle with customizable durations.
 * Integrates with AffectionSystem (completes → +10 affinity).
 *
 * NOTE: Container/close/maximize/drag are managed by the parent tabbed panel
 * (setupTabbedPanel in renderer.js). This class only manages inner content.
 */

export class PomodoroTimer {
  constructor(affectionSystem) {
    this._affection = affectionSystem;

    // DOM refs (inner content only)
    this._timeDisplay = document.getElementById('pomodoro-time');
    this._statusDisplay = document.getElementById('pomodoro-status');
    this._startBtn = document.getElementById('pomodoro-start-btn');
    this._resetBtn = document.getElementById('pomodoro-reset-btn');
    this._workInput = document.getElementById('pomodoro-work-min');
    this._breakInput = document.getElementById('pomodoro-break-min');
    this._todayCount = document.getElementById('pomodoro-today-count');
    this._illEl = document.getElementById('pomodoro-ill');

    // State
    this._running = false;
    this._phase = 'work';  // 'work' | 'break'
    this._remaining = 25 * 60; // seconds
    this._interval = null;
    this._completedToday = 0;
    this._todayDate = null;

    // Callbacks
    this._onComplete = null;  // called when pomodoro completes (for cat reactions)

    this._init();
  }

  _init() {
    this._startBtn.addEventListener('click', () => this._toggleTimer());
    this._resetBtn.addEventListener('click', () => this._reset());

    // Load today's count
    this._loadStats();

    // Initial display
    this._updateDisplay();
  }

  set onComplete(fn) { this._onComplete = fn; }

  _toggleTimer() {
    if (this._running) {
      this._pause();
    } else {
      this._start();
    }
  }

  _start() {
    if (!this._running) {
      if (this._remaining <= 0) {
        this._phase = 'work';
        this._remaining = this._getWorkSeconds();
      }
      this._running = true;
      this._startBtn.textContent = '暂停';
      this._startBtn.classList.add('running');
      this._workInput.disabled = true;
      this._breakInput.disabled = true;
      this._updateStatus();

      this._interval = setInterval(() => {
        this._remaining--;
        if (this._remaining <= 0) {
          this._onPhaseEnd();
        }
        this._updateDisplay();
      }, 1000);
    }
  }

  _pause() {
    this._running = false;
    this._startBtn.textContent = '继续';
    this._startBtn.classList.remove('running');
    clearInterval(this._interval);
    this._statusDisplay.textContent = '已暂停';
    this._statusDisplay.className = '';
  }

  _reset() {
    this._running = false;
    clearInterval(this._interval);
    this._phase = 'work';
    this._remaining = this._getWorkSeconds();
    this._startBtn.textContent = '开始';
    this._startBtn.classList.remove('running');
    this._workInput.disabled = false;
    this._breakInput.disabled = false;
    this._statusDisplay.textContent = '准备专注';
    this._statusDisplay.className = '';
    if (this._illEl) this._illEl.src = 'illustrations/pomodoro-focus.png';
    this._updateDisplay();
  }

  _onPhaseEnd() {
    clearInterval(this._interval);
    this._running = false;
    this._startBtn.classList.remove('running');
    this._workInput.disabled = false;
    this._breakInput.disabled = false;

    if (this._phase === 'work') {
      this._completedToday++;
      this._saveStats();
      this._updateTodayCount();

      if (this._affection) {
        this._affection.onPomodoroComplete();
      }

      if (this._onComplete) this._onComplete();

      this._phase = 'break';
      this._remaining = this._getBreakSeconds();
      this._statusDisplay.textContent = '休息时间！🎉';
      this._statusDisplay.className = 'break';
      if (this._illEl) this._illEl.src = 'illustrations/pomodoro-break.png';
      this._startBtn.textContent = '开始休息';
    } else {
      this._phase = 'work';
      this._remaining = this._getWorkSeconds();
      this._statusDisplay.textContent = '准备下一轮！';
      this._statusDisplay.className = '';
      this._startBtn.textContent = '开始';
    }

    this._updateDisplay();
  }

  _updateDisplay() {
    const min = Math.floor(this._remaining / 60);
    const sec = this._remaining % 60;
    this._timeDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  _updateStatus() {
    if (this._phase === 'work') {
      this._statusDisplay.textContent = '专注中... 🎯';
      this._statusDisplay.className = 'working';
      if (this._illEl) this._illEl.src = 'illustrations/pomodoro-focus.png';
    } else {
      this._statusDisplay.textContent = '休息时间~ ☕';
      if (this._illEl) this._illEl.src = 'illustrations/pomodoro-break.png';
      this._statusDisplay.className = 'break';
    }
  }

  _updateTodayCount() {
    this._todayCount.textContent = `今天：${this._completedToday} 🍅`;
  }

  _getWorkSeconds() {
    return Math.max(1, parseInt(this._workInput.value) || 25) * 60;
  }

  _getBreakSeconds() {
    return Math.max(1, parseInt(this._breakInput.value) || 5) * 60;
  }

  async _loadStats() {
    const today = new Date().toISOString().split('T')[0];
    const saved = await window.electronAPI.getStore('pomodoroStats');
    if (saved && saved.date === today) {
      this._completedToday = saved.count || 0;
    } else {
      this._completedToday = 0;
    }
    this._todayDate = today;
    this._updateTodayCount();
  }

  async _saveStats() {
    const today = new Date().toISOString().split('T')[0];
    if (this._todayDate !== today) {
      this._completedToday = 1;
      this._todayDate = today;
    }
    await window.electronAPI.setStore('pomodoroStats', {
      date: today,
      count: this._completedToday
    });
  }
}
