#!/usr/bin/env node

/**
 * Phase 2 AI Runtime - Integration Validation Script
 * 
 * This script validates that all Phase 2 components are correctly wired
 * without running the full Electron app. Run with:
 *   node phase2-validate.js
 */

const path = require('path');
const fs = require('fs');

// Track results
const results = [];
let errors = 0;
let warnings = 0;

function test(name, fn) {
  try {
    fn();
    results.push(`✅ ${name}`);
  } catch (err) {
    results.push(`❌ ${name}: ${err.message}`);
    errors++;
  }
}

function warn(msg) {
  results.push(`⚠️  ${msg}`);
  warnings++;
}

console.log('\n🧪 Phase 2 AI Runtime - Integration Validation\n');
console.log('Testing CommonJS modules from main process...\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const projectRoot = path.join(__dirname, 'src');

test('AITrigger exports correctly', () => {
  const { AITrigger, TRIGGER_TYPES } = require(path.join(projectRoot, 'ai-runtime', 'trigger'));
  if (!AITrigger || !AITrigger.create) throw new Error('AITrigger missing create method');
  if (!TRIGGER_TYPES.CHAT) throw new Error('TRIGGER_TYPES missing CHAT');
  const trigger = AITrigger.create('chat', 'chat.default', { userMessage: 'test' });
  if (!trigger.id || !trigger.type || !trigger.sceneId) throw new Error('Trigger missing fields');
});

test('AIRuntime exports correctly', () => {
  const { AIRuntime } = require(path.join(projectRoot, 'ai-runtime', 'runtime'));
  if (!AIRuntime) throw new Error('AIRuntime not exported');
  if (typeof AIRuntime !== 'function') throw new Error('AIRuntime is not a class');
});

test('AI Runtime index exports Phase 1+2', () => {
  const exports = require(path.join(projectRoot, 'ai-runtime', 'index'));
  const required = ['SceneRegistry', 'PromptRegistry', 'ModelProfiles', 'ContextHub', 'AIRuntime', 'AITrigger', 'TRIGGER_TYPES', 'registerSkillPrompts'];
  for (const key of required) {
    if (!exports[key]) throw new Error(`Missing export: ${key}`);
  }
});

test('SceneRegistry has 16 scenes registered', () => {
  const { SceneRegistry } = require(path.join(projectRoot, 'ai-runtime', 'index'));
  const scenes = SceneRegistry.listScenes();
  if (scenes.length !== 16) throw new Error(`Expected 16 scenes, got ${scenes.length}`);
  const expectedScenes = [
    'chat.default', 'chat.followup', 'chat.proactive',
    'quick.polish', 'quick.summarize', 'quick.explain', 'quick.ask',
    'vision.ocr',
    'skill.text-converter', 'skill.todo-management', 'skill.daily-report', 'skill.weekly-report', 'skill.ui-style-guide',
    'memory.extract',
    'proactive.scene-message', 'system.agent-task'
  ];
  for (const sceneId of expectedScenes) {
    if (!SceneRegistry.hasScene(sceneId)) throw new Error(`Missing scene: ${sceneId}`);
  }
});

test('PromptRegistry has 6 built-in prompts', () => {
  const { PromptRegistry } = require(path.join(projectRoot, 'ai-runtime', 'index'));
  const prompts = PromptRegistry.listPrompts();
  if (prompts.length < 6) throw new Error(`Expected at least 6 prompts, got ${prompts.length}`);
  const required = ['quick-polish', 'quick-summarize', 'quick-explain', 'quick-ask', 'memory-extract', 'vision-ocr'];
  for (const pid of required) {
    if (!PromptRegistry.hasPrompt(pid)) throw new Error(`Missing prompt: ${pid}`);
  }
});

test('ModelProfiles has 13+ profiles', () => {
  const { ModelProfiles } = require(path.join(projectRoot, 'ai-runtime', 'index'));
  const profiles = ModelProfiles.listProfiles();
  if (profiles.length < 13) throw new Error(`Expected at least 13 profiles, got ${profiles.length}`);
  const required = ['chat-stream', 'quick-polish', 'skill-complete', 'memory-extract', 'vision-ocr'];
  for (const pid of required) {
    if (!ModelProfiles.hasProfile(pid)) throw new Error(`Missing profile: ${pid}`);
  }
});

test('ContextHub registers 8 providers', () => {
  const { ContextHub } = require(path.join(projectRoot, 'ai-runtime', 'index'));
  const providers = ContextHub.listProviders();
  if (providers.length !== 8) throw new Error(`Expected 8 providers, got ${providers.length}`);
});

test('QuickPanelManager accepts aiRuntime parameter', () => {
  const QuickPanelManagerCode = fs.readFileSync(path.join(projectRoot, 'quick-panel', 'quick-panel-main.js'), 'utf-8');
  if (!QuickPanelManagerCode.includes('aiRuntime')) throw new Error('QuickPanelManager does not reference aiRuntime');
  if (!QuickPanelManagerCode.includes('AITrigger.create')) throw new Error('QuickPanelManager does not use AITrigger');
});

test('SkillEngine accepts aiRuntime parameter', () => {
  const SkillEngineCode = fs.readFileSync(path.join(projectRoot, 'skills', 'skill-engine.js'), 'utf-8');
  if (!SkillEngineCode.includes('this._aiRuntime')) throw new Error('SkillEngine does not have _aiRuntime member');
  if (!SkillEngineCode.includes('AITrigger.create')) throw new Error('SkillEngine does not use AITrigger');
});

test('ScreenshotOCR uses AIRuntime.vision()', () => {
  const OCRCode = fs.readFileSync(path.join(projectRoot, 'quick-panel', 'screenshot-ocr.js'), 'utf-8');
  if (!OCRCode.includes('this._aiRuntime.vision')) throw new Error('ScreenshotOCR does not call aiRuntime.vision()');
});

test('main.js wires AIRuntime and services', () => {
  const mainCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');
  if (!mainCode.includes('const aiRuntime = new AIRuntime')) throw new Error('main.js does not create AIRuntime');
  if (!mainCode.includes('aiRuntime.setServices')) throw new Error('main.js does not call setServices()');
  if (!mainCode.includes('new QuickPanelManager(mainWindow, store, aiClient, aiRuntime)')) throw new Error('main.js does not pass aiRuntime to QuickPanelManager');
  if (!mainCode.includes('new SkillEngine(store, skillRegistry, keyboardRecorder, aiClient, aiRuntime)')) throw new Error('main.js does not pass aiRuntime to SkillEngine');
  if (!mainCode.includes("ipcMain.handle('ai-runtime-get-registries'")) throw new Error('main.js missing registry mirror IPC handler');
});

test('preload.js exposes getAIRegistries', () => {
  const preloadCode = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf-8');
  if (!preloadCode.includes("getAIRegistries: () => ipcRenderer.invoke('ai-runtime-get-registries')")) {
    throw new Error('preload.js does not expose getAIRegistries()');
  }
});

console.log('Testing ESM modules from renderer process...\n');

test('AIRuntimeRenderer exported as ESM', () => {
  const rendererCode = fs.readFileSync(path.join(projectRoot, 'ai-runtime', 'runtime-renderer.js'), 'utf-8');
  if (!rendererCode.includes('export class AIRuntimeRenderer')) throw new Error('AIRuntimeRenderer not exported as ESM class');
  if (!rendererCode.includes('async init()')) throw new Error('AIRuntimeRenderer missing init() method');
  if (!rendererCode.includes('async *runStream(trigger)')) throw new Error('AIRuntimeRenderer missing runStream() generator');
  if (!rendererCode.includes('async run(trigger)')) throw new Error('AIRuntimeRenderer missing run() method');
  if (!rendererCode.includes('static createTrigger')) throw new Error('AIRuntimeRenderer missing createTrigger() static method');
});

test('AIService has setRuntime() method', () => {
  const aiServiceCode = fs.readFileSync(path.join(projectRoot, 'chat', 'ai-service.js'), 'utf-8');
  if (!aiServiceCode.includes('setRuntime(runtime)')) throw new Error('AIService missing setRuntime() method');
  if (!aiServiceCode.includes('this._runtime && this._runtime.isReady()')) throw new Error('AIService does not check runtime readiness');
});

test('AIService delegates chat to AIRuntimeRenderer', () => {
  const aiServiceCode = fs.readFileSync(path.join(projectRoot, 'chat', 'ai-service.js'), 'utf-8');
  if (!aiServiceCode.includes('this._runtime.runStream(trigger)')) throw new Error('AIService does not delegate to runtime.runStream()');
});

test('MemoryManager has runtime parameter', () => {
  const memoryCode = fs.readFileSync(path.join(projectRoot, 'chat', 'memory-manager.js'), 'utf-8');
  if (!memoryCode.includes('constructor(aiRuntimeRenderer)')) throw new Error('MemoryManager constructor does not accept aiRuntimeRenderer');
  if (!memoryCode.includes('this._runtime')) throw new Error('MemoryManager does not store runtime');
  if (!memoryCode.includes('this._runtime.run(trigger)')) throw new Error('MemoryManager does not call runtime.run()');
});

test('renderer.js creates AIRuntimeRenderer and injects', () => {
  const rendererCode = fs.readFileSync(path.join(projectRoot, 'renderer.js'), 'utf-8');
  if (!rendererCode.includes("import { AIRuntimeRenderer } from './ai-runtime/runtime-renderer.js'")) throw new Error('renderer.js does not import AIRuntimeRenderer');
  if (!rendererCode.includes('const aiRuntimeRenderer = new AIRuntimeRenderer')) throw new Error('renderer.js does not create AIRuntimeRenderer');
  if (!rendererCode.includes('await aiRuntimeRenderer.init()')) throw new Error('renderer.js does not call init()');
  if (!rendererCode.includes('aiService.setRuntime(aiRuntimeRenderer)')) throw new Error('renderer.js does not inject into AIService');
  if (!rendererCode.includes('new MemoryManager(aiRuntimeRenderer)')) throw new Error('renderer.js does not pass runtime to MemoryManager');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + results.join('\n'));
console.log(`\n📊 Results: ${results.length - errors - warnings} passed, ${errors} errors, ${warnings} warnings\n`);

if (errors > 0) {
  console.log('❌ Integration validation FAILED\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Integration validation PASSED WITH WARNINGS\n');
  process.exit(0);
} else {
  console.log('✅ All integration validations PASSED\n');
  process.exit(0);
}
