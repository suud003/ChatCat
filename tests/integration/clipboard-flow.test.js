/**
 * Integration test: clipboard signal → engine → mgr → intent
 *
 * End-to-end flow verification with mocked subsystems.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimingJudge } from '../../src/proactive/timing-judge.js';
import { NotificationMgr } from '../../src/proactive/notification-mgr.js';
import { setupNotificationDOM, cleanupDOM } from '../mocks/dom-helpers.js';
import {
  clipboardUrlScene,
  clipboardCodeScene,
} from '../../src/proactive/scenes/clipboard-aware.js';

describe('Clipboard flow integration', () => {
  let judge;
  let mgr;
  let character;

  beforeEach(async () => {
    vi.useFakeTimers();
    setupNotificationDOM();

    judge = new TimingJudge();
    judge._lastPushTime = 0;

    mgr = new NotificationMgr();
    await mgr.init(() => {});

    character = {
      triggerIntent: vi.fn(),
      constructor: { name: 'MockCharacter' },
    };
    mgr.setCharacter(character);
  });

  afterEach(() => {
    judge.destroy();
    cleanupDOM();
    vi.useRealTimers();
  });

  it('clipboard URL signal → curious intent on character', async () => {
    // Simulate engine behavior: clipboard bypasses judge
    const ctx = { type: 'url', isRepeat: false };
    const scene = clipboardUrlScene;

    // Check condition
    expect(scene.condition(ctx)).toBe(true);

    // Build notification (as engine would)
    const notification = {
      sceneId: scene.id,
      sceneName: scene.name,
      level: scene.level,
      message: scene.getMessage(ctx, 'lively'),
      actions: scene.actions,
      timestamp: Date.now(),
    };

    // Bypass timing judge (as engine does for clipboard)
    await mgr.push(notification);
    judge._lastPushTime = Date.now();

    // Verify intent was triggered
    expect(character.triggerIntent).toHaveBeenCalledWith('curious');
  });

  it('clipboard code signal → curious intent', async () => {
    const ctx = { type: 'code' };
    expect(clipboardCodeScene.condition(ctx)).toBe(true);

    const notification = {
      sceneId: clipboardCodeScene.id,
      sceneName: clipboardCodeScene.name,
      level: clipboardCodeScene.level,
      message: clipboardCodeScene.getMessage(ctx, 'cool'),
      actions: clipboardCodeScene.actions,
      timestamp: Date.now(),
    };

    await mgr.push(notification);
    expect(character.triggerIntent).toHaveBeenCalledWith('curious');
  });

  it('bubble dismiss → idle intent', async () => {
    // Push notification first
    await mgr.push({
      sceneId: 24,
      sceneName: 'clipboard-url',
      level: 'L3',
      message: 'Test',
      actions: [{ label: 'T', action: 'clipboard-translate' }],
      timestamp: Date.now(),
    });

    // Now hide bubble
    const bubble = document.getElementById('cat-bubble');
    mgr._hideBubble(bubble);

    expect(character.triggerIntent).toHaveBeenCalledWith('idle');
  });

  it('clipboard bypasses judge even when canPush is false', async () => {
    // Block the timing judge
    judge.setDoNotDisturb(true);
    expect(judge.canPush()).toBe(false);

    // But clipboard should still be pushable to mgr
    const result = await mgr.push({
      sceneId: 24,
      sceneName: 'clipboard-url',
      level: 'L3',
      message: 'Test',
      actions: [],
      timestamp: Date.now(),
    });

    expect(result).toBe(true);
    expect(character.triggerIntent).toHaveBeenCalledWith('curious');
  });

  it('full lifecycle: push → curious → hide → idle', async () => {
    await mgr.push({
      sceneId: 24,
      sceneName: 'clipboard-url',
      level: 'L3',
      message: 'Test',
      actions: [{ label: 'X', action: 'clipboard-translate' }],
      timestamp: Date.now(),
    });

    expect(character.triggerIntent).toHaveBeenNthCalledWith(1, 'curious');

    const bubble = document.getElementById('cat-bubble');
    mgr._hideBubble(bubble);

    expect(character.triggerIntent).toHaveBeenNthCalledWith(2, 'idle');
  });
});
