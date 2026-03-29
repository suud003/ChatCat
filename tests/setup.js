/**
 * Global test setup - runs before every test file.
 */
import { vi, beforeEach } from 'vitest';
import { createElectronAPIMock } from './mocks/electron-api-mock.js';

// --- Mock requestAnimationFrame / cancelAnimationFrame ---
let _rafId = 0;
globalThis.requestAnimationFrame = vi.fn(() => ++_rafId);
globalThis.cancelAnimationFrame = vi.fn();

// --- Mock performance.now ---
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = {};
}
// Let vitest fake timers handle performance.now when active;
// provide a default for non-timer tests.
if (typeof globalThis.performance.now !== 'function') {
  globalThis.performance.now = vi.fn(() => Date.now());
}

// --- Mock Image constructor ---
globalThis.Image = class MockImage {
  constructor() {
    this.src = '';
    this.onload = null;
    this.onerror = null;
  }
  set _src(v) { this.src = v; }
};

// --- Mock import.meta.url for sprite loaders ---
// (handled by vitest's native ESM support)

// --- Reset electronAPI before each test ---
beforeEach(() => {
  globalThis.window.electronAPI = createElectronAPIMock();
});
