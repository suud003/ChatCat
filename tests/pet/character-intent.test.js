/**
 * Character.triggerIntent() tests — 7 intents + state chain
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCanvasMock } from '../mocks/canvas-mock.js';
import { Character } from '../../src/pet/character.js';

describe('Character.triggerIntent', () => {
  let character;

  beforeEach(() => {
    vi.useFakeTimers();
    const { canvas } = createCanvasMock();
    character = new Character(canvas);
  });

  afterEach(() => {
    character.stop();
    vi.useRealTimers();
  });

  // --- curious ---

  describe('curious', () => {
    it('sets expressionState to surprised', () => {
      character.triggerIntent('curious');
      expect(character.expressionState).toBe('surprised');
    });

    it('sets _earAngleOffset to 0.25', () => {
      character.triggerIntent('curious');
      expect(character._earAngleOffset).toBe(0.25);
    });

    it('resets after 1500ms', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(1500);
      expect(character.expressionState).toBe('normal');
      expect(character._earAngleOffset).toBe(0);
    });

    it('does not reset before 1500ms', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(1400);
      expect(character.expressionState).toBe('surprised');
    });
  });

  // --- working ---

  describe('working', () => {
    it('starts a typing interval', () => {
      character.triggerIntent('working');
      expect(character._workingInterval).not.toBeNull();
    });

    it('calls triggerTyping every 200ms', () => {
      const spy = vi.spyOn(character, 'triggerTyping');
      character.triggerIntent('working');
      vi.advanceTimersByTime(600);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  // --- proud ---

  describe('proud', () => {
    it('clears working interval', () => {
      character.triggerIntent('working');
      expect(character._workingInterval).not.toBeNull();
      character.triggerIntent('proud');
      expect(character._workingInterval).toBeNull();
    });

    it('sets expressionState to happy', () => {
      character.triggerIntent('proud');
      expect(character.expressionState).toBe('happy');
    });

    it('resets to normal after 2000ms', () => {
      character.triggerIntent('proud');
      vi.advanceTimersByTime(2000);
      expect(character.expressionState).toBe('normal');
    });
  });

  // --- sleepy ---

  describe('sleepy', () => {
    it('clears working interval', () => {
      character.triggerIntent('working');
      character.triggerIntent('sleepy');
      expect(character._workingInterval).toBeNull();
    });

    it('sets state to sleep', () => {
      character.triggerIntent('sleepy');
      expect(character.state).toBe('sleep');
    });

    it('resets to idle after 3000ms', () => {
      character.triggerIntent('sleepy');
      vi.advanceTimersByTime(3000);
      expect(character.state).toBe('idle');
    });
  });

  // --- alert ---

  describe('alert', () => {
    it('sets expressionState to surprised', () => {
      character.triggerIntent('alert');
      expect(character.expressionState).toBe('surprised');
    });

    it('sets _earAngleOffset to 0.35', () => {
      character.triggerIntent('alert');
      expect(character._earAngleOffset).toBe(0.35);
    });

    it('resets after 2000ms', () => {
      character.triggerIntent('alert');
      vi.advanceTimersByTime(2000);
      expect(character.expressionState).toBe('normal');
      expect(character._earAngleOffset).toBe(0);
    });
  });

  // --- encouraging ---

  describe('encouraging', () => {
    it('clears working interval', () => {
      character.triggerIntent('working');
      character.triggerIntent('encouraging');
      expect(character._workingInterval).toBeNull();
    });

    it('sets expressionState to happy', () => {
      character.triggerIntent('encouraging');
      expect(character.expressionState).toBe('happy');
    });

    it('resets after 2000ms', () => {
      character.triggerIntent('encouraging');
      vi.advanceTimersByTime(2000);
      expect(character.expressionState).toBe('normal');
    });
  });

  // --- idle ---

  describe('idle', () => {
    it('clears working interval', () => {
      character.triggerIntent('working');
      character.triggerIntent('idle');
      expect(character._workingInterval).toBeNull();
    });

    it('resets expressionState to normal', () => {
      character.triggerIntent('curious');
      character.triggerIntent('idle');
      expect(character.expressionState).toBe('normal');
    });

    it('resets _earAngleOffset to 0', () => {
      character.triggerIntent('alert');
      character.triggerIntent('idle');
      expect(character._earAngleOffset).toBe(0);
    });
  });

  // --- State chain ---

  describe('state chain: curious → working → proud', () => {
    it('transitions correctly through intent chain', () => {
      // Curious
      character.triggerIntent('curious');
      expect(character.expressionState).toBe('surprised');

      // Working (before curious timer fires)
      character.triggerIntent('working');
      expect(character._workingInterval).not.toBeNull();

      // Proud cleans up working
      character.triggerIntent('proud');
      expect(character._workingInterval).toBeNull();
      expect(character.expressionState).toBe('happy');

      // After 2s resets
      vi.advanceTimersByTime(2000);
      expect(character.expressionState).toBe('normal');
    });
  });

  // --- Unknown intent ---

  describe('unknown intent (default)', () => {
    it('acts like idle for unknown intent name', () => {
      character.triggerIntent('curious');
      character.triggerIntent('nonexistent_intent');
      expect(character.expressionState).toBe('normal');
      expect(character._earAngleOffset).toBe(0);
    });
  });
});
