/**
 * AI Runtime — Phase 1 unified definition layer.
 *
 * Provides centralized management of:
 *   - SceneRegistry:  AI scene definitions (what, when, how)
 *   - PromptRegistry: Prompt templates with version tracking
 *   - ModelProfiles:  Model parameter configurations
 *   - ContextHub:     Context assembly with pluggable providers
 *
 * Usage:
 *   const { SceneRegistry, PromptRegistry, ModelProfiles, ContextHub } = require('./ai-runtime');
 *
 * Initialization order:
 *   1. Core modules are available on require()
 *   2. Scene definitions auto-register via scenes/*.js
 *   3. Context providers must be registered after services are available
 *      (call initProviders() from main.js after service initialization)
 */

'use strict';

const { SceneRegistry } = require('./scene-registry');
const { PromptRegistry } = require('./prompt-registry');
const { ModelProfiles } = require('./model-profiles');
const { ContextHub } = require('./context/context-hub');

// ─── Register all built-in scenes ────────────────────────────────────────
require('./scenes/chat-scenes');
require('./scenes/quick-scenes');
require('./scenes/skill-scenes');
require('./scenes/memory-scenes');
require('./scenes/proactive-scenes');

// ─── Register context providers ──────────────────────────────────────────
const { personalityProvider } = require('./context/providers/personality-provider');
const { historyProvider } = require('./context/providers/history-provider');
const { memoryProvider } = require('./context/providers/memory-provider');
const { behaviorProvider } = require('./context/providers/behavior-provider');
const { todoProvider } = require('./context/providers/todo-provider');
const { rawTypingProvider } = require('./context/providers/raw-typing-provider');
const { convertedTextProvider } = require('./context/providers/converted-text-provider');
const { pomodoroProvider } = require('./context/providers/pomodoro-provider');
const { appContextProvider } = require('./context/providers/app-context-provider');

ContextHub.registerProvider(personalityProvider);
ContextHub.registerProvider(historyProvider);
ContextHub.registerProvider(memoryProvider);
ContextHub.registerProvider(behaviorProvider);
ContextHub.registerProvider(todoProvider);
ContextHub.registerProvider(rawTypingProvider);
ContextHub.registerProvider(convertedTextProvider);
ContextHub.registerProvider(pomodoroProvider);
ContextHub.registerProvider(appContextProvider);

// ─── Convenience: log initialization status ──────────────────────────────

console.log(
  `[AIRuntime] Initialized: ${SceneRegistry.size} scenes, ` +
  `${PromptRegistry.listPrompts().length} prompts, ` +
  `${ModelProfiles.listProfiles().length} model profiles, ` +
  `${ContextHub.listProviders().length} context providers`
);

// ─── Skill Prompt Adapter ────────────────────────────────────────────────

/**
 * Register skill prompts from SkillRegistry into PromptRegistry.
 * Call this after SkillRegistry has been initialized.
 *
 * @param {import('../skills/skill-registry').SkillRegistry} skillRegistry
 */
function registerSkillPrompts(skillRegistry) {
  const skillMetas = skillRegistry.getAllMeta();

  const contextMap = {
    rawTyping: 'raw-typing',
    convertedText: 'converted-text',
    todos: 'todo',
    pomodoroStats: 'pomodoro',
  };

  for (const meta of skillMetas) {
    const templateId = `skill.${meta.name}`;

    // Register prompt
    if (!PromptRegistry.hasPrompt(templateId)) {
      PromptRegistry.register({
        templateId,
        version: '1.0.0',
        source: 'adapter:skill-registry',
        // Lazy resolver: reads SKILL.md body on demand
        resolver: () => {
          const body = skillRegistry.readSkillBody(meta.name);
          return {
            system: body || '',
            userTemplate: null,
          };
        },
      });
    }

    // Register scene if not already defined (e.g. imported skills)
    if (!SceneRegistry.hasScene(templateId)) {
      const contextProviders = (meta.context || [])
        .map(k => contextMap[k] || k)
        .filter(Boolean);

      SceneRegistry.register({
        id: templateId,
        category: 'skill',
        description: meta.description || `Skill: ${meta.name}`,
        prompt: { templateId, mode: 'instruction' },
        contextProviders,
        modelProfile: 'skill-complete',
        outputMode: 'markdown',
        memoryPolicy: 'none',
        postProcessors: [],
      });
    }
  }

  console.log(`[AIRuntime] Registered ${skillMetas.length} skill prompts`);
}

// ─── Phase 2: Execution layer ────────────────────────────────────────────
const { AIRuntime } = require('./runtime');
const { AITrigger, TRIGGER_TYPES } = require('./trigger');

// ─── Phase 3: Trigger Bus ────────────────────────────────────────────────
const { TriggerBus } = require('./trigger-bus');
const { ScheduledTriggerRegistry } = require('./scheduled-trigger-registry');

module.exports = {
  // Phase 1: Definition layer
  SceneRegistry,
  PromptRegistry,
  ModelProfiles,
  ContextHub,
  registerSkillPrompts,

  // Phase 2: Execution layer
  AIRuntime,
  AITrigger,
  TRIGGER_TYPES,

  // Phase 3: Trigger Bus
  TriggerBus,
  ScheduledTriggerRegistry,
};
