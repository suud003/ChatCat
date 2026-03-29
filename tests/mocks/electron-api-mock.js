/**
 * Mock for window.electronAPI used by notification-mgr and proactive-engine.
 */
import { vi } from 'vitest';

export function createElectronAPIMock() {
  const store = {};

  return {
    getStore: vi.fn(async (key) => store[key] ?? null),
    setStore: vi.fn(async (key, value) => { store[key] = value; }),
    clipboardGetLatest: vi.fn(async () => ''),
    clipboardCopy: vi.fn(async () => {}),
    onTriggerChunk: vi.fn(() => vi.fn()),      // returns remove fn
    onTriggerCompleted: vi.fn(() => vi.fn()),   // returns remove fn
    onTriggerError: vi.fn(() => vi.fn()),       // returns remove fn
    skillExecute: vi.fn(async () => ({ success: true })),
    // Internal: direct access to store for assertions
    _store: store,
  };
}
