/**
 * PinyinDetector - Detects pinyin input composition
 * Ported from keyboard_recorder.py PinyinDetector v12
 *
 * Buffers lowercase letters and determines whether they are
 * pinyin (Chinese input) or plain English based on how they
 * are confirmed (digit selection, space, enter, or timeout).
 */

const PINYIN_TIMEOUT_MS = 2000;

class PinyinDetector {
  constructor() {
    this._pendingChars = [];
    this._pendingTime = 0;
    this._inComposition = false;
  }

  /**
   * Reset detector state.
   */
  reset() {
    this._pendingChars = [];
    this._pendingTime = 0;
    this._inComposition = false;
  }

  /**
   * Add a lowercase letter character to the buffer.
   * Returns { buffered: boolean, flushedText: string|null }
   */
  addChar(char) {
    const now = Date.now();
    let flushedText = null;

    // If timeout exceeded, flush pending as English first
    if (this._pendingChars.length > 0 && (now - this._pendingTime) > PINYIN_TIMEOUT_MS) {
      flushedText = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
    }

    this._pendingChars.push(char);
    this._pendingTime = now;
    this._inComposition = true;

    return { buffered: true, flushedText };
  }

  /**
   * A digit 1-9 was pressed — pinyin candidate selection.
   * Returns { handled: boolean, pinyin: string|null, digit: string }
   */
  onDigit(digitChar) {
    if (this._pendingChars.length > 0) {
      const pinyin = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
      return { handled: true, pinyin, digit: digitChar };
    }
    return { handled: false, pinyin: null, digit: digitChar };
  }

  /**
   * Space pressed — selects first candidate.
   * Returns { handled: boolean, pinyin: string|null }
   */
  onSpace() {
    if (this._pendingChars.length > 0) {
      const pinyin = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
      return { handled: true, pinyin };
    }
    return { handled: false, pinyin: null };
  }

  /**
   * Enter pressed — confirm entire input.
   * Returns { handled: boolean, pinyin: string|null }
   */
  onEnter() {
    if (this._pendingChars.length > 0) {
      const pinyin = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
      return { handled: true, pinyin };
    }
    return { handled: false, pinyin: null };
  }

  /**
   * Backspace pressed — remove last pending char.
   * Returns { handled: boolean }
   */
  onBackspace() {
    if (this._pendingChars.length > 0) {
      this._pendingChars.pop();
      if (this._pendingChars.length === 0) {
        this._inComposition = false;
      }
      return { handled: true };
    }
    return { handled: false };
  }

  /**
   * Escape pressed — discard all pending pinyin.
   * Returns { discarded: boolean }
   */
  onEscape() {
    if (this._pendingChars.length > 0) {
      this._pendingChars = [];
      this._inComposition = false;
      return { discarded: true };
    }
    return { discarded: false };
  }

  /**
   * A non-alphanumeric special key was pressed.
   * Flush pending chars as English text.
   * Returns { flushedText: string|null }
   */
  onSpecialKey() {
    if (this._pendingChars.length > 0) {
      const text = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
      return { flushedText: text };
    }
    return { flushedText: null };
  }

  /**
   * Timer-based flush: if pending chars have exceeded timeout, flush as English.
   * Returns { flushedText: string|null }
   */
  flushTimeout() {
    if (this._pendingChars.length > 0 && (Date.now() - this._pendingTime) > PINYIN_TIMEOUT_MS) {
      const text = this._pendingChars.join('');
      this._pendingChars = [];
      this._inComposition = false;
      return { flushedText: text };
    }
    return { flushedText: null };
  }

  get hasPending() {
    return this._pendingChars.length > 0;
  }

  get pendingText() {
    return this._pendingChars.join('');
  }
}

module.exports = { PinyinDetector };
