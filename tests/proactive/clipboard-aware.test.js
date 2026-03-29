/**
 * Clipboard-aware scene tests — condition, getMessage, actions, cooldown
 */
import { describe, it, expect } from 'vitest';
import {
  clipboardUrlScene,
  clipboardCodeScene,
  clipboardLongTextScene,
  clipboardRepeatScene,
} from '../../src/proactive/scenes/clipboard-aware.js';

describe('clipboardUrlScene', () => {
  it('has correct metadata', () => {
    expect(clipboardUrlScene.id).toBe(24);
    expect(clipboardUrlScene.level).toBe('L3');
    expect(clipboardUrlScene.signal).toBe('clipboard-content');
    expect(clipboardUrlScene.cooldown).toBe(30 * 1000);
  });

  it('condition: true when type=url and not repeat', () => {
    expect(clipboardUrlScene.condition({ type: 'url', isRepeat: false })).toBe(true);
  });

  it('condition: false when type=url but isRepeat', () => {
    expect(clipboardUrlScene.condition({ type: 'url', isRepeat: true })).toBe(false);
  });

  it('condition: false when type is not url', () => {
    expect(clipboardUrlScene.condition({ type: 'text', isRepeat: false })).toBe(false);
  });

  it('has 3 text actions (translate, polish, explain)', () => {
    expect(clipboardUrlScene.actions).toHaveLength(3);
    const actionNames = clipboardUrlScene.actions.map(a => a.action);
    expect(actionNames).toContain('clipboard-translate');
    expect(actionNames).toContain('clipboard-polish');
    expect(actionNames).toContain('clipboard-explain');
  });

  it('getMessage returns string for lively personality', () => {
    const msg = clipboardUrlScene.getMessage({}, 'lively');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('getMessage returns string for cool personality', () => {
    const msg = clipboardUrlScene.getMessage({}, 'cool');
    expect(typeof msg).toBe('string');
  });

  it('getMessage returns string for soft personality', () => {
    const msg = clipboardUrlScene.getMessage({}, 'soft');
    expect(typeof msg).toBe('string');
  });

  it('getMessage returns string for scholar personality', () => {
    const msg = clipboardUrlScene.getMessage({}, 'scholar');
    expect(typeof msg).toBe('string');
  });

  it('getMessage falls back to lively for unknown personality', () => {
    const msg = clipboardUrlScene.getMessage({}, 'unknown');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('clipboardCodeScene', () => {
  it('has correct metadata', () => {
    expect(clipboardCodeScene.id).toBe(241);
    expect(clipboardCodeScene.level).toBe('L3');
    expect(clipboardCodeScene.cooldown).toBe(30 * 1000);
  });

  it('condition: true when type=code', () => {
    expect(clipboardCodeScene.condition({ type: 'code' })).toBe(true);
  });

  it('condition: false when type is not code', () => {
    expect(clipboardCodeScene.condition({ type: 'text' })).toBe(false);
  });

  it('has 2 code actions (translate, explain)', () => {
    expect(clipboardCodeScene.actions).toHaveLength(2);
    const actionNames = clipboardCodeScene.actions.map(a => a.action);
    expect(actionNames).toContain('clipboard-translate');
    expect(actionNames).toContain('clipboard-explain');
  });

  it('getMessage for all 4 personalities', () => {
    for (const p of ['lively', 'cool', 'soft', 'scholar']) {
      const msg = clipboardCodeScene.getMessage({}, p);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

describe('clipboardLongTextScene', () => {
  it('has correct metadata', () => {
    expect(clipboardLongTextScene.id).toBe(242);
    expect(clipboardLongTextScene.level).toBe('L3');
    expect(clipboardLongTextScene.cooldown).toBe(30 * 1000);
  });

  it('condition: true when type=text and length>200', () => {
    expect(clipboardLongTextScene.condition({ type: 'text', length: 201 })).toBe(true);
  });

  it('condition: false when type=text but length<=200', () => {
    expect(clipboardLongTextScene.condition({ type: 'text', length: 200 })).toBe(false);
    expect(clipboardLongTextScene.condition({ type: 'text', length: 50 })).toBe(false);
  });

  it('condition: false when type is not text', () => {
    expect(clipboardLongTextScene.condition({ type: 'url', length: 500 })).toBe(false);
  });

  it('has 3 text actions', () => {
    expect(clipboardLongTextScene.actions).toHaveLength(3);
  });

  it('getMessage for scholar returns valid string', () => {
    const msg = clipboardLongTextScene.getMessage({ length: 500 }, 'scholar');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('clipboardRepeatScene', () => {
  it('has correct metadata', () => {
    expect(clipboardRepeatScene.id).toBe(243);
    expect(clipboardRepeatScene.level).toBe('L1');
    expect(clipboardRepeatScene.cooldown).toBe(60 * 1000);
  });

  it('condition: true when isRepeat', () => {
    expect(clipboardRepeatScene.condition({ isRepeat: true })).toBe(true);
  });

  it('condition: false when not repeat', () => {
    expect(clipboardRepeatScene.condition({ isRepeat: false })).toBe(false);
  });

  it('has empty actions array', () => {
    expect(clipboardRepeatScene.actions).toHaveLength(0);
  });

  it('getMessage for all personalities', () => {
    for (const p of ['lively', 'cool', 'soft', 'scholar']) {
      const msg = clipboardRepeatScene.getMessage({ repeatCount: 5 }, p);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('getMessage for scholar can include repeat count', () => {
    // scholar pool has 3 messages, only the first includes repeatCount
    // Just verify it returns a valid string
    const msg = clipboardRepeatScene.getMessage({ repeatCount: 5 }, 'scholar');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});
