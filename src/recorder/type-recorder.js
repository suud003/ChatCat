/**
 * TypeRecorder - Renderer-side UI controller for the recorder panel
 * ES module for the renderer process
 */

export class TypeRecorder {
  constructor() {
    this._container = document.getElementById('recorder-container');
    this._bubble = document.getElementById('recorder-bubble');
    this._header = document.getElementById('recorder-bubble-header');
    this._body = document.getElementById('recorder-body');
    this._preview = document.getElementById('recorder-preview');
    this._toggleBtn = document.getElementById('recorder-toggle-btn');
    this._dirBtn = document.getElementById('recorder-dir-btn');
    this._dirDisplay = document.getElementById('recorder-dir-display');
    this._closeBtn = document.getElementById('recorder-close');
    this._maximizeBtn = document.getElementById('recorder-maximize');
    this._statusDot = document.getElementById('recorder-status-dot');

    this._visible = false;
    this._recording = false;
    this._maximized = false;
    this._savedPosition = null;
    this.positionFn = null;

    this._setupEvents();
    this._setupDrag();
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

    this._closeBtn.addEventListener('click', () => {
      this.hide();
    });

    this._maximizeBtn.addEventListener('click', () => {
      this._toggleMaximize();
    });
  }

  _setupDrag() {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    this._header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this._container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      this._container.style.left = (origLeft + (e.clientX - startX)) + 'px';
      this._container.style.top = (origTop + (e.clientY - startY)) + 'px';
      this._container.style.bottom = 'auto';
      this._container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
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
    this._toggleBtn.textContent = recording ? 'STOP' : 'REC';
    this._toggleBtn.classList.toggle('recording', recording);
    this._statusDot.classList.toggle('recording', recording);
  }

  _toggleMaximize() {
    this._maximized = !this._maximized;
    if (this._maximized) {
      this._savedPosition = {
        left: this._container.style.left,
        top: this._container.style.top,
        bottom: this._container.style.bottom,
        right: this._container.style.right
      };
      this._container.classList.add('maximized');
      this._maximizeBtn.textContent = '❐';
      this._maximizeBtn.title = 'Restore';
    } else {
      this._container.classList.remove('maximized');
      this._maximizeBtn.textContent = '□';
      this._maximizeBtn.title = 'Maximize';
      if (this._savedPosition) {
        Object.assign(this._container.style, this._savedPosition);
        this._savedPosition = null;
      }
    }
  }

  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  async show() {
    this._visible = true;
    this._container.classList.remove('hidden');
    if (this.positionFn) this.positionFn(this._container);
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

  hide() {
    this._visible = false;
    this._container.classList.add('hidden');
    if (this._maximized) {
      this._maximized = false;
      this._container.classList.remove('maximized');
      this._maximizeBtn.textContent = '□';
      if (this._savedPosition) {
        Object.assign(this._container.style, this._savedPosition);
        this._savedPosition = null;
      }
    }
  }
}
