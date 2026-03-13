/**
 * Input Tracker - handles global keyboard/mouse events from main process
 */

export class InputTracker {
  constructor(character) {
    this.character = character;
    this.keysPressed = new Set();
    this.setupListeners();
  }

  setupListeners() {
    // Global keyboard events from main process (via uiohook)
    window.electronAPI.onGlobalKeydown((data) => {
      this.keysPressed.add(data.keycode);
      this.character.triggerTyping();
    });

    window.electronAPI.onGlobalKeyup((data) => {
      this.keysPressed.delete(data.keycode);
    });

    window.electronAPI.onGlobalClick((data) => {
      this.character.triggerClick();
    });

    // Fallback: local keyboard events (when uiohook is not available)
    document.addEventListener('keydown', (e) => {
      if (!this.keysPressed.size) {
        this.character.triggerTyping();
      }
    });
  }
}
