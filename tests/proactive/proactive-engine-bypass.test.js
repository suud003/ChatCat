/**
 * ProactiveEngine clipboard bypass tests
 *
 * Verifies that clipboard-content and app-switch signals bypass TimingJudge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test _triggerScene directly to avoid full init() which needs electronAPI
describe('ProactiveEngine bypass logic', () => {
  let engine;
  let pushSpy;
  let enqueueSpy;

  beforeEach(async () => {
    vi.useFakeTimers();

    // Dynamic import to get the class
    const { ProactiveEngine } = await import('../../src/proactive/proactive-engine.js');
    engine = new ProactiveEngine();

    // Mock subsystems without full init
    engine._personality = 'lively';
    engine._enabled = true;
    engine._enabledTypes = ['info', 'care', 'efficiency', 'chat'];
    engine._cooldowns = {};

    // Mock notificationMgr.push
    pushSpy = vi.fn(async () => true);
    engine.notificationMgr.push = pushSpy;

    // Mock timingJudge
    enqueueSpy = vi.fn(() => ({ immediate: true }));
    engine.timingJudge.enqueue = enqueueSpy;
    engine.timingJudge.canPush = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeScene(signal, overrides = {}) {
    return {
      id: 999,
      name: `test-${signal}`,
      type: 'efficiency',
      level: 'L3',
      signal,
      condition: () => true,
      getMessage: () => 'Test message',
      actions: [],
      cooldown: 0,
      ...overrides,
    };
  }

  it('clipboard-content signal bypasses TimingJudge', () => {
    const scene = makeScene('clipboard-content');
    engine._triggerScene(scene, { type: 'url' });

    // Should call push directly, NOT enqueue
    expect(pushSpy).toHaveBeenCalled();
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('app-switch signal bypasses TimingJudge', () => {
    const scene = makeScene('app-switch');
    engine._triggerScene(scene, { appName: 'Chrome' });

    expect(pushSpy).toHaveBeenCalled();
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('other signals go through TimingJudge enqueue', () => {
    const scene = makeScene('typing-pause');
    engine._triggerScene(scene, {});

    expect(enqueueSpy).toHaveBeenCalled();
    // immediate=true so push should also be called
    expect(pushSpy).toHaveBeenCalled();
  });

  it('other signals with immediate=false do NOT push', () => {
    enqueueSpy.mockReturnValue({ immediate: false, queued: true });
    const scene = makeScene('idle');
    engine._triggerScene(scene, {});

    expect(enqueueSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('clipboard bypass works even when canPush() is false', () => {
    engine.timingJudge.canPush = vi.fn(() => false);
    const scene = makeScene('clipboard-content');
    engine._triggerScene(scene, { type: 'code' });

    // Should still push directly
    expect(pushSpy).toHaveBeenCalled();
  });

  it('updates _lastPushTime on bypass', () => {
    const before = Date.now();
    const scene = makeScene('clipboard-content');
    engine._triggerScene(scene, {});

    expect(engine.timingJudge._lastPushTime).toBeGreaterThanOrEqual(before);
  });

  it('records cooldown after trigger', () => {
    const scene = makeScene('clipboard-content', { id: 42 });
    engine._triggerScene(scene, {});

    expect(engine._cooldowns[42]).toBeDefined();
    expect(engine._cooldowns[42]).toBeGreaterThan(0);
  });
});
