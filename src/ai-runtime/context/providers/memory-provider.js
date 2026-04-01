/**
 * Memory Provider — V2 结构化记忆上下文提供者
 *
 * 从 electron-store 'aiMemories' 读取记忆，
 * 按分类和重要性组织后注入到 AI 上下文中。
 *
 * 支持两种注入模式：
 * 1. 直接注入（从渲染进程 MemoryManager 传入）
 * 2. 从 store 读取（主进程回退方案）
 */

'use strict';

const DEFAULT_TOP_N = 10;

// 分类定义（与 memory-manager.js 保持同步）
const CATEGORIES = {
  user_info: { label: '个人信息', icon: '👤' },
  preference: { label: '偏好习惯', icon: '⭐' },
  instruction: { label: '用户指令', icon: '📌' },
  fact: { label: '事实知识', icon: '📝' },
  relationship: { label: '关系互动', icon: '💬' },
};

/**
 * 将记忆列表转换为结构化摘要文本
 */
function buildStructuredSummary(memories) {
  if (!memories || memories.length === 0) return '';

  // 按分类分组
  const grouped = {};
  for (const mem of memories) {
    const cat = mem.category || 'fact';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(mem);
  }

  let summary = '';
  for (const [cat, mems] of Object.entries(grouped)) {
    const catInfo = CATEGORIES[cat] || { icon: '📎', label: cat };
    summary += `${catInfo.icon} ${catInfo.label}:\n`;
    for (const m of mems) {
      const marker = m.source === 'user_explicit' ? '📌' : '-';
      const content = m.content || m.fact || '';
      summary += `  ${marker} ${content}\n`;
    }
  }
  return summary;
}

/**
 * 对记忆列表按重要性和来源排序，取 Top N
 */
function selectTopMemories(memories, topN) {
  const sorted = [...memories].sort((a, b) => {
    // 用户主动添加的优先
    if (a.source === 'user_explicit' && b.source !== 'user_explicit') return -1;
    if (b.source === 'user_explicit' && a.source !== 'user_explicit') return 1;
    // 重要性排序
    const impOrder = { high: 3, medium: 2, low: 1 };
    const impDiff = (impOrder[b.importance] || 2) - (impOrder[a.importance] || 2);
    if (impDiff !== 0) return impDiff;
    // 最近更新的优先
    return (b.updatedAt || b.timestamp || 0) - (a.updatedAt || a.timestamp || 0);
  });
  return sorted.slice(0, topN);
}

const memoryProvider = {
  id: 'memory',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;
    const runtimeInput = input.runtimeInput || {};
    const topN = runtimeInput.maxMemories || DEFAULT_TOP_N;

    // 模式 1：直接注入（从渲染进程 MemoryManager 传入）
    if (runtimeInput.memories) {
      const selected = selectTopMemories(runtimeInput.memories, topN);
      return {
        memories: selected,
        structuredSummary: buildStructuredSummary(selected),
      };
    }

    // 模式 2：从 store 读取
    if (store) {
      const allMemories = store.get('aiMemories') || [];
      const selected = selectTopMemories(allMemories, topN);
      return {
        memories: selected,
        structuredSummary: buildStructuredSummary(selected),
      };
    }

    return { memories: [], structuredSummary: '' };
  },
};

module.exports = { memoryProvider, buildStructuredSummary, selectTopMemories };
