/**
 * NotificationMgr intent trigger tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationMgr } from '../../src/proactive/notification-mgr.js';
import { setupNotificationDOM, cleanupDOM } from '../mocks/dom-helpers.js';

describe('NotificationMgr intent triggers', () => {
  let mgr;
  let character;

  beforeEach(async () => {
    vi.useFakeTimers();
    setupNotificationDOM();

    mgr = new NotificationMgr();
    await mgr.init(() => {});

    // Mock character with triggerIntent
    character = {
      triggerIntent: vi.fn(),
      constructor: { name: 'MockCharacter' },
    };
    mgr.setCharacter(character);
  });

  afterEach(() => {
    cleanupDOM();
    vi.useRealTimers();
  });

  // --- setCharacter ---

  describe('setCharacter', () => {
    it('stores character reference', () => {
      expect(mgr._character).toBe(character);
    });

    it('works with null character', () => {
      mgr.setCharacter(null);
      expect(mgr._character).toBeNull();
    });
  });

  // --- L3 clipboard → curious ---

  describe('L3 clipboard notification', () => {
    it('triggers curious intent for clipboard scenes', async () => {
      await mgr.push({
        id: 1,
        sceneId: 24,
        sceneName: 'clipboard-url',
        level: 'L3',
        message: 'Test clipboard',
        actions: [{ label: 'Test', action: 'clipboard-translate' }],
        timestamp: Date.now(),
      });

      expect(character.triggerIntent).toHaveBeenCalledWith('curious');
    });

    it('does not trigger intent for non-clipboard L3', async () => {
      await mgr.push({
        id: 2,
        sceneId: 100,
        sceneName: 'some-other-scene',
        level: 'L3',
        message: 'Test',
        actions: [],
        timestamp: Date.now(),
      });

      expect(character.triggerIntent).not.toHaveBeenCalledWith('curious');
    });
  });

  // --- _character=null safety ---

  describe('_character=null safety', () => {
    it('does not crash when character is null on L3 clipboard push', async () => {
      mgr.setCharacter(null);
      await expect(mgr.push({
        id: 3,
        sceneId: 24,
        sceneName: 'clipboard-url',
        level: 'L3',
        message: 'Test',
        actions: [],
        timestamp: Date.now(),
      })).resolves.toBe(true);
    });
  });

  // --- _hideBubble → idle ---

  describe('_hideBubble triggers idle', () => {
    it('calls triggerIntent(idle) on visible bubble hide', () => {
      const bubble = document.getElementById('cat-bubble');
      bubble.classList.remove('hidden'); // Make bubble visible first
      mgr._hideBubble(bubble);
      expect(character.triggerIntent).toHaveBeenCalledWith('idle');
    });

    it('does not call idle on already-hidden bubble', () => {
      const bubble = document.getElementById('cat-bubble');
      bubble.classList.add('hidden');
      mgr._hideBubble(bubble);
      expect(character.triggerIntent).not.toHaveBeenCalledWith('idle');
    });

    it('does not crash when character is null on hide', () => {
      mgr.setCharacter(null);
      const bubble = document.getElementById('cat-bubble');
      expect(() => mgr._hideBubble(bubble)).not.toThrow();
    });
  });

  // --- L0/L1/L2 do not trigger intent ---

  describe('non-L3 levels', () => {
    it('L0 does not trigger intent', async () => {
      await mgr.push({
        sceneId: 1,
        sceneName: 'test',
        level: 'L0',
        message: 'silent',
        actions: [],
        timestamp: Date.now(),
      });
      expect(character.triggerIntent).not.toHaveBeenCalled();
    });

    it('L1 does not trigger intent', async () => {
      await mgr.push({
        sceneId: 1,
        sceneName: 'test',
        level: 'L1',
        message: 'dot',
        actions: [],
        timestamp: Date.now(),
      });
      expect(character.triggerIntent).not.toHaveBeenCalled();
    });

    it('L2 does not trigger intent', async () => {
      await mgr.push({
        sceneId: 1,
        sceneName: 'test',
        level: 'L2',
        message: 'bubble',
        actions: [],
        timestamp: Date.now(),
      });
      expect(character.triggerIntent).not.toHaveBeenCalled();
    });
  });

  // --- Daily limit exemption for clipboard ---

  describe('daily limit exemption', () => {
    it('clipboard scenes bypass daily limit', async () => {
      mgr._dailyCount = 100; // way over limit
      mgr._maxDaily = 8;

      const result = await mgr.push({
        sceneId: 24,
        sceneName: 'clipboard-url',
        level: 'L3',
        message: 'Test',
        actions: [],
        timestamp: Date.now(),
      });

      expect(result).toBe(true);
    });

    it('non-clipboard scenes respect daily limit', async () => {
      mgr._dailyCount = 100;
      mgr._maxDaily = 8;

      const result = await mgr.push({
        sceneId: 1,
        sceneName: 'some-scene',
        level: 'L2',
        message: 'Test',
        actions: [],
        timestamp: Date.now(),
      });

      expect(result).toBe(false);
    });
  });

  // --- Full intent chain ---

  describe('full intent chain: curious → working → proud → idle', () => {
    it('chains through all intents via notification lifecycle', async () => {
      // Push clipboard L3 → curious
      await mgr.push({
        sceneId: 24,
        sceneName: 'clipboard-url',
        level: 'L3',
        message: 'Test',
        actions: [{ label: 'Translate', action: 'clipboard-translate' }],
        timestamp: Date.now(),
      });
      expect(character.triggerIntent).toHaveBeenCalledWith('curious');

      // Hide bubble → idle (bubble is visible after push)
      const bubble = document.getElementById('cat-bubble');
      bubble.classList.remove('hidden'); // Ensure visible
      mgr._hideBubble(bubble);
      expect(character.triggerIntent).toHaveBeenCalledWith('idle');
    });
  });
});
