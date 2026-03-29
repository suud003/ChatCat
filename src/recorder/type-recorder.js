/**
 * TypeRecorder - Renderer-side UI controller for the recorder tab content.
 * ES module for the renderer process.
 *
 * NOTE: Container/close/maximize/drag are managed by the parent tabbed panel
 * (setupTabbedPanel in renderer.js). This class only manages inner content.
 */

export class TypeRecorder {
  constructor() {
    // DOM refs (inner content only)
    this._preview = document.getElementById('recorder-preview');
    this._dirBtn = document.getElementById('recorder-dir-btn');
    this._dirDisplay = document.getElementById('recorder-dir-display');
    this._statusDot = document.getElementById('recorder-status-dot');
    this._inactiveHint = document.getElementById('recorder-inactive-hint');
    this._gotoSettingsBtn = document.getElementById('recorder-goto-settings');

    this._recording = false;

    this._setupEvents();
    this._loadStatus();
    this._listenUpdates();
  }

  _setupEvents() {
    this._dirBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.recorderSetDir();
      if (result.outputDir) {
        this._dirDisplay.textContent = result.outputDir;
        this._dirDisplay.title = result.outputDir;
      }
    });

    // "前往设置" button: open settings panel
    this._gotoSettingsBtn?.addEventListener('click', () => {
      // Close tools panel
      const toolsPanel = document.getElementById('tools-container');
      if (toolsPanel) toolsPanel.classList.add('hidden');

      // Open settings panel
      const settingsContainer = document.getElementById('settings-container');
      if (settingsContainer) {
        settingsContainer.classList.remove('hidden');
      }
    });
  }

  async _loadStatus() {
    const status = await window.electronAPI.recorderGetStatus();
    this._updateRecordingState(status.recording);
    if (status.outputDir) {
      this._dirDisplay.textContent = status.outputDir;
      this._dirDisplay.title = status.outputDir;
    }

    // V2 Pillar C: 首次启动时如果已处于录制状态，立刻加载今日已有内容
    if (status.recording) {
      await this.loadTodayContent();
    }
  }

  _listenUpdates() {
    window.electronAPI.onRecorderUpdate((data) => {
      if (data.lines && data.lines.length > 0) {
        for (const line of data.lines) {
          const div = document.createElement('div');
          div.textContent = line;
          this._preview.appendChild(div);
        }
        while (this._preview.childNodes.length > 50) {
          this._preview.removeChild(this._preview.firstChild);
        }
        this._preview.scrollTop = this._preview.scrollHeight;
      }
    });

    // 监听录制状态变化（start/stop 时 recorder 主动推送）
    window.electronAPI.onRecorderStateChanged?.((data) => {
      this._updateRecordingState(data.recording);
    });

    // 监听授权变化 (V2 Pillar C: 授权后加载历史数据并启动，撤销时清空并停止)
    window.electronAPI.onConsentStatusChanged?.((data) => {
      if (data.granted) {
        this.loadTodayContent();
        this._updateRecordingState(true);
      } else {
        this._preview.innerHTML = '';
        this._updateRecordingState(false);
      }
    });
  }

  _updateRecordingState(recording) {
    this._recording = recording;
    this._statusDot.classList.toggle('recording', recording);

    // Show/hide inactive hint based on recording state
    if (this._inactiveHint) {
      this._inactiveHint.classList.toggle('hidden', recording);
    }
    // Hide preview & controls when not recording, show when recording
    if (this._preview) {
      this._preview.style.display = recording ? '' : 'none';
    }
    const controls = document.getElementById('recorder-controls');
    if (controls) {
      controls.style.display = recording ? '' : 'none';
    }
    if (this._dirDisplay) {
      this._dirDisplay.style.display = recording ? '' : 'none';
    }
  }

  async loadTodayContent() {
    const content = await window.electronAPI.recorderGetTodayContent();
    if (content) {
      this._preview.innerHTML = '';
      for (const line of content.split('\n')) {
        if (!line) continue;
        const div = document.createElement('div');
        div.textContent = line;
        this._preview.appendChild(div);
      }
      this._preview.scrollTop = this._preview.scrollHeight;
    }
  }
}
