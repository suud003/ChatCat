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
    this._toggleBtn = document.getElementById('recorder-toggle-btn');
    this._dirBtn = document.getElementById('recorder-dir-btn');
    this._dirDisplay = document.getElementById('recorder-dir-display');
    this._statusDot = document.getElementById('recorder-status-dot');

    this._recording = false;

    this._setupEvents();
    this._loadStatus();
    this._listenUpdates();
  }

  _setupEvents() {
    this._toggleBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.recorderToggle();
      this._updateRecordingState(result.recording);
    });

    this._dirBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.recorderSetDir();
      if (result.outputDir) {
        this._dirDisplay.textContent = result.outputDir;
        this._dirDisplay.title = result.outputDir;
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
  }

  _updateRecordingState(recording) {
    this._recording = recording;
    this._toggleBtn.textContent = recording ? '停止' : '录制';
    this._toggleBtn.classList.toggle('recording', recording);
    this._statusDot.classList.toggle('recording', recording);
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
