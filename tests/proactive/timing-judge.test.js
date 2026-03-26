/**
 * TimingJudge unit tests — canPush / enqueue / flush full condition matrix
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimingJudge } from '../../src/proactive/timing-judge.js';

describe('TimingJudge', () => {
  let judge;

  beforeEach(() => {
    vi.useFakeTimers();
    judge = new TimingJudge();
    // Don't call init() to avoid auto-flush interval unless needed
  });

  afterEach(() => {
    judge.destroy();
    vi.useRealTimers();
  });

  // ========== canPush() ==========

  describe('canPush()', () => {
    it('returns true when all conditions are met', () => {
      judge._lastPushTime = 0; // long ago
      expect(judge.canPush()).toBe(true);
    });

    it('returns false when doNotDisturb is true', () => {
      judge.setDoNotDisturb(true);
      expect(judge.canPush()).toBe(false);
    });

    it('returns false when pomodoro is active', () => {
      judge.setPomodoroActive(true);
      expect(judge.canPush()).toBe(false);
    });

    it('returns false when signalCollector reports typing', () => {
      judge._signalCollector = { isTyping: true };
      expect(judge.canPush()).toBe(false);
    });

    it('returns true when signalCollector reports not typing', () => {
      judge._signalCollector = { isTyping: false };
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(true);
    });

    it('returns false when last push is within minPushInterval', () => {
      judge._lastPushTime = Date.now(); // just pushed
      expect(judge.canPush()).toBe(false);
    });

    it('returns true when last push is beyond minPushInterval', () => {
      judge._lastPushTime = Date.now() - 6 * 60 * 1000; // 6 min ago
      expect(judge.canPush()).toBe(true);
    });

    it('respects custom minPushInterval', () => {
      judge.setMinPushInterval(1000); // 1 second
      judge._lastPushTime = Date.now() - 500; // 0.5s ago
      expect(judge.canPush()).toBe(false);

      judge._lastPushTime = Date.now() - 1500; // 1.5s ago
      expect(judge.canPush()).toBe(true);
    });

    // Quiet hours (non-wrapping): e.g., 22-7 means 22:00 to 07:00
    it('returns false during quiet hours (non-wrapping, e.g., 1-6)', () => {
      judge.setQuietHours(1, 6);
      // Mock hour = 3 (within 1-6)
      vi.setSystemTime(new Date('2026-01-01T03:00:00'));
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(false);
    });

    it('returns true outside quiet hours (non-wrapping)', () => {
      judge.setQuietHours(1, 6);
      vi.setSystemTime(new Date('2026-01-01T12:00:00'));
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(true);
    });

    it('returns false during quiet hours (wrapping midnight, e.g., 23-7)', () => {
      judge.setQuietHours(23, 7);
      // Hour = 2, should be in quiet range
      vi.setSystemTime(new Date('2026-01-01T02:00:00'));
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(false);
    });

    it('returns false at start of wrapping quiet hours (hour=23)', () => {
      judge.setQuietHours(23, 7);
      vi.setSystemTime(new Date('2026-01-01T23:30:00'));
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(false);
    });

    it('returns true outside wrapping quiet hours (hour=12)', () => {
      judge.setQuietHours(23, 7);
      vi.setSystemTime(new Date('2026-01-01T12:00:00'));
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(true);
    });

    it('returns true when quiet hours are not set', () => {
      judge._lastPushTime = 0;
      expect(judge.canPush()).toBe(true);
    });

    it('prioritizes DND over other checks', () => {
      judge.setDoNotDisturb(true);
      judge._lastPushTime = 0;
      judge._signalCollector = { isTyping: false };
      expect(judge.canPush()).toBe(false);
    });

    it('checks conditions in order: DND > pomodoro > typing > interval > quietHours', () => {
      // All blocking conditions active
      judge.setDoNotDisturb(true);
      judge.setPomodoroActive(true);
      judge._signalCollector = { isTyping: true };
      judge._lastPushTime = Date.now();
      judge.setQuietHours(0, 24);

      // DND returns false first
      expect(judge.canPush()).toBe(false);

      // Remove DND, pomodoro blocks
      judge.setDoNotDisturb(false);
      expect(judge.canPush()).toBe(false);
    });
  });

  // ========== enqueue() ==========

  describe('enqueue()', () => {
    it('returns immediate:true when canPush() is true', () => {
      judge._lastPushTime = 0;
      const result = judge.enqueue({ level: 'L2', message: 'test' });
      expect(result.immediate).toBe(true);
    });

    it('updates _lastPushTime on immediate delivery', () => {
      judge._lastPushTime = 0;
      const before = Date.now();
      judge.enqueue({ level: 'L2', message: 'test' });
      expect(judge._lastPushTime).toBeGreaterThanOrEqual(before);
    });

    it('returns immediate:false, queued:true when canPush() is false', () => {
      judge.setDoNotDisturb(true);
      const result = judge.enqueue({ level: 'L2', message: 'test' });
      expect(result.immediate).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('adds to queue when canPush() is false', () => {
      judge.setDoNotDisturb(true);
      judge.enqueue({ level: 'L2', message: 'a' });
      judge.enqueue({ level: 'L3', message: 'b' });
      expect(judge._queue.length).toBe(2);
    });

    it('sorts queue by priority descending (L3 > L2 > L1 > L0)', () => {
      judge.setDoNotDisturb(true);
      judge.enqueue({ level: 'L0', message: 'low' });
      judge.enqueue({ level: 'L3', message: 'high' });
      judge.enqueue({ level: 'L1', message: 'mid' });

      expect(judge._queue[0].notification.level).toBe('L3');
      expect(judge._queue[1].notification.level).toBe('L1');
      expect(judge._queue[2].notification.level).toBe('L0');
    });

    it('truncates queue at maxQueueSize=3', () => {
      judge.setDoNotDisturb(true);
      judge.enqueue({ level: 'L1', message: '1' });
      judge.enqueue({ level: 'L1', message: '2' });
      judge.enqueue({ level: 'L1', message: '3' });
      judge.enqueue({ level: 'L1', message: '4' }); // should be dropped or oldest dropped

      expect(judge._queue.length).toBe(3);
    });

    it('keeps highest priority items when truncating', () => {
      judge.setDoNotDisturb(true);
      judge.enqueue({ level: 'L0', message: 'lowest' });
      judge.enqueue({ level: 'L1', message: 'low' });
      judge.enqueue({ level: 'L2', message: 'mid' });
      judge.enqueue({ level: 'L3', message: 'high' });

      // After sorting + truncation, L3, L2, L1 should remain
      expect(judge._queue.length).toBe(3);
      expect(judge._queue[0].notification.level).toBe('L3');
      expect(judge._queue[1].notification.level).toBe('L2');
      expect(judge._queue[2].notification.level).toBe('L1');
    });
  });

  // ========== flush() ==========

  describe('flush()', () => {
    it('returns null when queue is empty', () => {
      expect(judge.flush()).toBeNull();
    });

    it('returns null when canPush() is false', () => {
      judge.setDoNotDisturb(true);
      judge._queue.push({
        notification: { level: 'L2', message: 'test' },
        priority: 2,
        timestamp: Date.now(),
      });
      expect(judge.flush()).toBeNull();
    });

    it('returns highest priority notification when canPush() is true', () => {
      judge._lastPushTime = 0;
      judge._queue.push(
        { notification: { level: 'L1', message: 'lo' }, priority: 1, timestamp: Date.now() },
        { notification: { level: 'L3', message: 'hi' }, priority: 3, timestamp: Date.now() },
      );
      // Queue is already sorted (L3 first) by enqueue, but here we push manually
      judge._queue.sort((a, b) => b.priority - a.priority);

      const result = judge.flush();
      expect(result.level).toBe('L3');
      expect(judge._queue.length).toBe(1);
    });

    it('updates _lastPushTime after flush', () => {
      judge._lastPushTime = 0;
      judge._queue.push({
        notification: { level: 'L2', message: 'test' },
        priority: 2,
        timestamp: Date.now(),
      });
      const before = Date.now();
      judge.flush();
      expect(judge._lastPushTime).toBeGreaterThanOrEqual(before);
    });

    it('returns items one at a time', () => {
      judge._lastPushTime = 0;
      judge._queue.push(
        { notification: { level: 'L2', message: 'a' }, priority: 2, timestamp: Date.now() },
        { notification: { level: 'L1', message: 'b' }, priority: 1, timestamp: Date.now() },
      );

      const first = judge.flush();
      expect(first).not.toBeNull();
      // After first flush, _lastPushTime is updated, so canPush is false (within 5min)
      expect(judge.flush()).toBeNull();
    });
  });

  // ========== init() + auto-flush ==========

  describe('init()', () => {
    it('stores signal collector reference', () => {
      const sc = { isTyping: false };
      judge.init(sc);
      expect(judge._signalCollector).toBe(sc);
    });

    it('sets up auto-flush timer', () => {
      const sc = { isTyping: false };
      judge.init(sc);
      expect(judge._flushTimer).not.toBeNull();
    });
  });
});
