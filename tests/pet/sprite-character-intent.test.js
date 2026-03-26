/**
 * SpriteCharacter.triggerIntent() tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCanvasMock } from '../mocks/canvas-mock.js';
import { SpriteCharacter } from '../../src/pet/pixel-character.js';

describe('SpriteCharacter.triggerIntent', () => {
  let character;

  beforeEach(() => {
    vi.useFakeTimers();
    const { canvas } = createCanvasMock();
    // SpriteCharacter doesn't start RAF in constructor, so safe to create
    character = new SpriteCharacter(canvas);
    // Mark as not loaded so _animate doesn't try to draw
    character._loaded = false;
  });

  afterEach(() => {
    character.destroy();
    vi.useRealTimers();
  });

  // --- curious ---

  describe('curious', () => {
    it('sets _clickExpr with emoji ❓', () => {
      character.triggerIntent('curious');
      expect(character._clickExpr).not.toBeNull();
      expect(character._clickExpr.emoji).toBe('❓');
    });

    it('has duration 2500ms', () => {
      character.triggerIntent('curious');
      expect(character._clickExpr.duration).toBe(2500);
    });

    it('clears _clickExpr after 2500ms', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(2500);
      expect(character._clickExpr).toBeNull();
    });

    it('lifts both paws and opens mouth (curious pose)', () => {
      character.triggerIntent('curious');
      expect(character.leftPawDown).toBe(true);
      expect(character.rightPawDown).toBe(true);
      expect(character.mouthOpen).toBe(true);
    });

    it('reverts pose after 2500ms', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(2500);
      expect(character.leftPawDown).toBe(false);
      expect(character.rightPawDown).toBe(false);
      expect(character.mouthOpen).toBe(false);
    });
  });

  // --- working ---

  describe('working', () => {
    it('sets _clickExpr with emoji ⚡', () => {
      character.triggerIntent('working');
      expect(character._clickExpr.emoji).toBe('⚡');
    });

    it('has very long duration (persistent)', () => {
      character.triggerIntent('working');
      expect(character._clickExpr.duration).toBe(999999);
    });

    it('does not auto-clear', () => {
      character.triggerIntent('working');
      vi.advanceTimersByTime(5000);
      // Should still be set (no auto-clear timer for working)
      expect(character._clickExpr).not.toBeNull();
    });
  });

  // --- proud ---

  describe('proud', () => {
    it('sets _clickExpr with emoji ✨', () => {
      character.triggerIntent('proud');
      expect(character._clickExpr.emoji).toBe('✨');
    });

    it('opens mouth', () => {
      character.triggerIntent('proud');
      expect(character.mouthOpen).toBe(true);
    });

    it('closes mouth after 1500ms', () => {
      character.triggerIntent('proud');
      vi.advanceTimersByTime(1500);
      expect(character.mouthOpen).toBe(false);
    });

    it('clears _clickExpr after 2500ms', () => {
      character.triggerIntent('proud');
      vi.advanceTimersByTime(2500);
      expect(character._clickExpr).toBeNull();
    });
  });

  // --- sleepy ---

  describe('sleepy', () => {
    it('sets _clickExpr to null', () => {
      character.triggerIntent('curious');
      character.triggerIntent('sleepy');
      expect(character._clickExpr).toBeNull();
    });

    it('closes mouth', () => {
      character.mouthOpen = true;
      character.triggerIntent('sleepy');
      expect(character.mouthOpen).toBe(false);
    });
  });

  // --- alert ---

  describe('alert', () => {
    it('sets _clickExpr with emoji ❗', () => {
      character.triggerIntent('alert');
      expect(character._clickExpr.emoji).toBe('❗');
    });

    it('has duration 2500ms', () => {
      character.triggerIntent('alert');
      expect(character._clickExpr.duration).toBe(2500);
    });
  });

  // --- encouraging ---

  describe('encouraging', () => {
    it('sets _clickExpr with emoji ⭐', () => {
      character.triggerIntent('encouraging');
      expect(character._clickExpr.emoji).toBe('⭐');
    });

    it('opens mouth', () => {
      character.triggerIntent('encouraging');
      expect(character.mouthOpen).toBe(true);
    });
  });

  // --- idle ---

  describe('idle', () => {
    it('does not clear _clickExpr while animation is still active', () => {
      character.triggerIntent('curious');
      // Immediately sending idle should NOT cancel the ongoing curious animation
      character.triggerIntent('idle');
      expect(character._clickExpr).not.toBeNull();
      expect(character._clickExpr.emoji).toBe('❓');
    });

    it('does not reset pose while animation is still active', () => {
      character.triggerIntent('curious');
      character.triggerIntent('idle');
      // Pose should remain (curious still animating)
      expect(character.leftPawDown).toBe(true);
      expect(character.rightPawDown).toBe(true);
    });

    it('clears _clickExpr after animation has finished', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(2500); // Wait for curious to expire
      character.triggerIntent('idle');
      expect(character._clickExpr).toBeNull();
    });

    it('resets paws and mouth when no animation is active', () => {
      character.mouthOpen = true;
      character.leftPawDown = true;
      character.triggerIntent('idle');
      expect(character.mouthOpen).toBe(false);
      expect(character.leftPawDown).toBe(false);
    });
  });

  // --- unknown intent ---

  describe('unknown intent', () => {
    it('does not crash', () => {
      expect(() => character.triggerIntent('nonexistent')).not.toThrow();
    });

    it('does not set _clickExpr for unmapped intent', () => {
      character._clickExpr = null;
      character.triggerIntent('nonexistent');
      // Since emoji is undefined for unknown name, the if(emoji) block doesn't run
      expect(character._clickExpr).toBeNull();
    });
  });
});
