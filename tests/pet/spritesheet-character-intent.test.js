/**
 * SpriteSheetCharacter.triggerIntent() tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCanvasMock } from '../mocks/canvas-mock.js';
import { SpriteSheetCharacter } from '../../src/pet/spritesheet-character.js';
import meta from '../fixtures/spritesheet-meta.json';

describe('SpriteSheetCharacter.triggerIntent', () => {
  let character;

  beforeEach(() => {
    vi.useFakeTimers();
    const { canvas } = createCanvasMock();
    character = new SpriteSheetCharacter(canvas);
    // Inject fixture metadata so _setState works
    character._meta = JSON.parse(JSON.stringify(meta));
    character._loaded = true;
  });

  afterEach(() => {
    character.destroy();
    vi.useRealTimers();
  });

  // --- curious ---

  describe('curious', () => {
    it('sets state to click-react', () => {
      character.triggerIntent('curious');
      expect(character._state).toBe('click-react');
    });

    it('resets idle timer', () => {
      character._idleTime = 10000;
      character.triggerIntent('curious');
      expect(character._idleTime).toBe(0);
    });

    it('reverts to idle after 2500ms if still click-react', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(2500);
      expect(character._state).toBe('idle');
    });

    it('does not revert if state changed before timeout', () => {
      character.triggerIntent('curious');
      character._setState('happy');
      vi.advanceTimersByTime(2500);
      expect(character._state).toBe('happy'); // not overwritten
    });
  });

  // --- working ---

  describe('working', () => {
    it('sets state to idle if previously sleeping or thinking', () => {
      character._state = 'sleep';
      character.triggerIntent('working');
      expect(character._state).toBe('idle');
    });

    it('no longer starts typing interval', () => {
      character.triggerIntent('working');
      expect(character._workingInterval).toBeNull();
    });
  });

  // --- proud ---

  describe('proud', () => {
    it('clears working interval', () => {
      character.triggerIntent('skill-working');
      character.triggerIntent('proud');
      expect(character._workingInterval).toBeNull();
    });

    it('triggers happy state', () => {
      character.triggerIntent('proud');
      expect(character._state).toBe('happy');
    });

    it('reverts to idle after HAPPY_DURATION (2000ms)', () => {
      character.triggerIntent('proud');
      vi.advanceTimersByTime(2000);
      expect(character._state).toBe('idle');
    });
  });

  // --- sleepy ---

  describe('sleepy', () => {
    it('clears working interval', () => {
      character.triggerIntent('skill-working');
      character.triggerIntent('sleepy');
      expect(character._workingInterval).toBeNull();
    });

    it('sets state to sleep', () => {
      character.triggerIntent('sleepy');
      expect(character._state).toBe('sleep');
    });

    it('reverts to idle after 3000ms', () => {
      character.triggerIntent('sleepy');
      vi.advanceTimersByTime(3000);
      expect(character._state).toBe('idle');
    });
  });

  // --- alert ---

  describe('alert', () => {
    it('sets state to click-react', () => {
      character.triggerIntent('alert');
      expect(character._state).toBe('click-react');
    });

    it('reverts to idle after 2000ms', () => {
      character.triggerIntent('alert');
      vi.advanceTimersByTime(2000);
      expect(character._state).toBe('idle');
    });
  });

  // --- encouraging ---

  describe('encouraging', () => {
    it('clears working interval', () => {
      character.triggerIntent('skill-working');
      character.triggerIntent('encouraging');
      expect(character._workingInterval).toBeNull();
    });

    it('triggers happy state', () => {
      character.triggerIntent('encouraging');
      expect(character._state).toBe('happy');
    });
  });

  // --- idle ---

  describe('idle', () => {
    it('clears working interval', () => {
      character.triggerIntent('skill-working');
      character.triggerIntent('idle');
      expect(character._workingInterval).toBeNull();
    });

    it('does not interrupt active click-react animation', () => {
      character.triggerIntent('curious');
      expect(character._state).toBe('click-react');
      character.triggerIntent('idle');
      // Should NOT revert to idle while curious animation is still active
      expect(character._state).toBe('click-react');
    });

    it('sets state to idle after animation expires', () => {
      character.triggerIntent('curious');
      vi.advanceTimersByTime(2500); // curious animation expires
      expect(character._state).toBe('idle');
    });
  });

  // --- _meta=null safety ---

  describe('_meta=null safety', () => {
    it('_setState silently returns when _meta is null', () => {
      character._meta = null;
      expect(() => character.triggerIntent('curious')).not.toThrow();
      // State should not change since _setState checks _meta
      expect(character._state).toBe('idle');
    });
  });

  // --- State chain ---

  describe('state chain: curious → skill-working → proud → idle', () => {
    it('transitions through full chain correctly', () => {
      character.triggerIntent('curious');
      expect(character._state).toBe('click-react');

      character.triggerIntent('skill-working');
      expect(character._workingInterval).not.toBeNull();

      character.triggerIntent('proud');
      expect(character._workingInterval).toBeNull();
      expect(character._state).toBe('happy');

      vi.advanceTimersByTime(2000);
      expect(character._state).toBe('idle');
    });
  });
});
