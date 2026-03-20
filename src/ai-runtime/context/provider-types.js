'use strict';

/**
 * Constants for Context Providers
 * Using Object.freeze to simulate an enum, ensuring type safety and IDE autocomplete.
 */
const CONTEXT_PROVIDERS = Object.freeze({
  PERSONALITY: 'personality',
  HISTORY: 'history',
  MEMORY: 'memory',
  BEHAVIOR: 'behavior',
  TODO: 'todo',
  RAW_TYPING: 'raw-typing',
  CONVERTED_TEXT: 'converted-text',
  POMODORO: 'pomodoro',
  ACTIVE_WINDOW: 'active-window', // Reserved for future use
});

module.exports = { CONTEXT_PROVIDERS };
