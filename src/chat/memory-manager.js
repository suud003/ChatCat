/**
 * AI Long-term Memory Manager — V5 重构版
 *
 * 仿照 Claude Code 的记忆系统设计，支持：
 * 1. 用户主动添加记忆（"记住..."、"remember..."）
 * 2. 结构化分类（user_info / preference / instruction / fact / relationship）
 * 3. 智能更新/合并（相似记忆自动合并，而非简单去重）
 * 4. 重要性分级（importance: high / medium / low）
 * 5. 来源追踪（source: user_explicit / ai_extracted）
 * 6. 用户可通过对话管理记忆（查看/删除/更新）
 *
 * 存储结构：
 * {
 *   id: number,
 *   content: string,          // 记忆内容
 *   category: string,         // 分类
 *   importance: string,       // 重要性
 *   source: string,           // 来源
 *   createdAt: number,        // 创建时间
 *   updatedAt: number,        // 更新时间
 *   accessCount: number,      // 被引用次数
 *   tags: string[],           // 标签（用于检索）
 * }
 *
 * Scene: memory.extract / memory.manage (AI Runtime SceneRegistry)
 */

const MAX_MEMORIES = 50;

// 记忆分类定义
const CATEGORIES = {
  user_info: { label: '个人信息', icon: '👤', description: '姓名、生日、职业等基本信息' },
  preference: { label: '偏好习惯', icon: '⭐', description: '喜好、习惯、风格偏好' },
  instruction: { label: '用户指令', icon: '📌', description: '用户明确要求记住的规则或指令' },
  fact: { label: '事实知识', icon: '📝', description: '用户提到的事实、项目信息等' },
  relationship: { label: '关系互动', icon: '💬', description: '互动历史、情感记录' },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

// 用户主动添加记忆的意图检测模式
const MEMORY_ADD_PATTERNS = [
  // 中文
  /^(?:请?(?:帮我)?记住|记下|记一下|记得|以后记住|帮我记|你要记住|请记住)[：:，,\s]*(.+)/i,
  /^(?:从现在开始|以后|今后)[，,\s]*(.+)/i,
  // 英文
  /^(?:remember|memorize|note that|keep in mind|don't forget)[：:，,\s]*(.+)/i,
  /^(?:from now on|going forward|always)[，,\s]*(.+)/i,
];

// 用户删除记忆的意图检测模式
const MEMORY_DELETE_PATTERNS = [
  /^(?:忘记|忘掉|删除记忆|清除记忆|不要记|别记)[：:，,\s]*(.+)/i,
  /^(?:forget|delete memory|remove memory|don't remember)[：:，,\s]*(.+)/i,
];

// 用户查看记忆的意图检测模式
const MEMORY_VIEW_PATTERNS = [
  /^(?:你记得什么|你记住了什么|查看记忆|我的记忆|你知道我什么|你了解我什么)/i,
  /^(?:what do you remember|show memories|my memories|what do you know about me)/i,
];

// 用户更新记忆的意图检测模式
const MEMORY_UPDATE_PATTERNS = [
  /^(?:更新记忆|修改记忆|其实|纠正一下|更正)[：:，,\s]*(.+)/i,
  /^(?:update memory|correct that|actually)[：:，,\s]*(.+)/i,
];

export class MemoryManager {
  constructor() {
    this._memories = []; // 结构化记忆列表
    this._nextId = 1;
    this._triggerBus = null;
  }

  // ─── 初始化 ──────────────────────────────────────────────────────────

  /**
   * 设置 TriggerBusRenderer（用于 AI 提取记忆）
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }

  async init() {
    const saved = await window.electronAPI.getStore('aiMemories');
    if (Array.isArray(saved) && saved.length > 0) {
      // 兼容旧格式迁移
      this._memories = saved.map(m => this._migrateMemory(m));
      this._nextId = this._memories.reduce((max, m) => Math.max(max, (m.id || 0) + 1), 1);
    }
  }

  /**
   * 旧格式记忆迁移到新格式
   */
  _migrateMemory(mem) {
    if (mem.content) return mem; // 已经是新格式
    // 旧格式: { id, fact, category, timestamp }
    const oldCategoryMap = {
      name: 'user_info',
      preference: 'preference',
      habit: 'preference',
      birthday: 'user_info',
      work: 'user_info',
      other: 'fact',
    };
    return {
      id: mem.id,
      content: mem.fact || '',
      category: oldCategoryMap[mem.category] || 'fact',
      importance: 'medium',
      source: 'ai_extracted',
      createdAt: mem.timestamp || Date.now(),
      updatedAt: mem.timestamp || Date.now(),
      accessCount: 0,
      tags: [],
    };
  }

  // ─── 用户意图检测（在聊天流程中调用）──────────────────────────────────

  /**
   * 检测用户消息是否包含记忆管理意图。
   * 返回 { type, content } 或 null。
   *
   * type: 'add' | 'delete' | 'view' | 'update' | null
   */
  detectMemoryIntent(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return null;
    const msg = userMessage.trim();

    // 检测添加意图
    for (const pattern of MEMORY_ADD_PATTERNS) {
      const match = msg.match(pattern);
      if (match) {
        return { type: 'add', content: match[1].trim() };
      }
    }

    // 检测删除意图
    for (const pattern of MEMORY_DELETE_PATTERNS) {
      const match = msg.match(pattern);
      if (match) {
        return { type: 'delete', content: match[1].trim() };
      }
    }

    // 检测查看意图
    for (const pattern of MEMORY_VIEW_PATTERNS) {
      if (pattern.test(msg)) {
        return { type: 'view', content: '' };
      }
    }

    // 检测更新意图
    for (const pattern of MEMORY_UPDATE_PATTERNS) {
      const match = msg.match(pattern);
      if (match) {
        return { type: 'update', content: match[1].trim() };
      }
    }

    return null;
  }

  // ─── 记忆 CRUD ──────────────────────────────────────────────────────

  /**
   * 用户主动添加记忆（高优先级，source = user_explicit）
   */
  async addUserMemory(content, category = null) {
    if (!content || typeof content !== 'string') return null;

    // 如果没有指定分类，尝试自动分类
    const finalCategory = category || this._autoClassify(content);

    // 检查是否有相似记忆需要合并
    const similar = this._findSimilar(content);
    if (similar) {
      // 更新已有记忆
      similar.content = content;
      similar.updatedAt = Date.now();
      similar.source = 'user_explicit'; // 用户主动更新，提升来源等级
      similar.importance = 'high'; // 用户主动添加的记忆重要性高
      await this._save();
      return { action: 'updated', memory: similar };
    }

    const memory = {
      id: this._nextId++,
      content: content.substring(0, 200),
      category: finalCategory,
      importance: 'high', // 用户主动添加 = 高重要性
      source: 'user_explicit',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      tags: this._extractTags(content),
    };

    this._memories.push(memory);
    this._enforceLimit();
    await this._save();
    return { action: 'created', memory };
  }

  /**
   * AI 自动提取记忆（低优先级，source = ai_extracted）
   */
  async addExtractedMemory(content, category = 'fact', importance = 'medium') {
    if (!content || typeof content !== 'string') return null;

    const validCategory = CATEGORY_KEYS.includes(category) ? category : 'fact';

    // 检查重复
    const similar = this._findSimilar(content);
    if (similar) {
      // AI 提取的不覆盖用户主动添加的
      if (similar.source === 'user_explicit') return null;
      similar.content = content;
      similar.updatedAt = Date.now();
      await this._save();
      return { action: 'updated', memory: similar };
    }

    const memory = {
      id: this._nextId++,
      content: content.substring(0, 200),
      category: validCategory,
      importance,
      source: 'ai_extracted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      tags: this._extractTags(content),
    };

    this._memories.push(memory);
    this._enforceLimit();
    await this._save();
    return { action: 'created', memory };
  }

  /**
   * 删除匹配关键词的记忆
   */
  deleteByKeyword(keyword) {
    if (!keyword) return [];
    const kw = keyword.toLowerCase();
    const toDelete = this._memories.filter(m =>
      m.content.toLowerCase().includes(kw)
    );
    if (toDelete.length === 0) return [];

    const deletedIds = toDelete.map(m => m.id);
    this._memories = this._memories.filter(m => !deletedIds.includes(m.id));
    this._save();
    return toDelete;
  }

  /**
   * 按 ID 删除记忆
   */
  deleteMemory(id) {
    const before = this._memories.length;
    this._memories = this._memories.filter(m => m.id !== id);
    if (this._memories.length < before) {
      this._save();
      return true;
    }
    return false;
  }

  /**
   * 清除所有记忆
   */
  clearAll() {
    this._memories = [];
    this._nextId = 1;
    this._save();
  }

  // ─── 记忆检索 ──────────────────────────────────────────────────────

  /**
   * 获取用于 prompt 注入的记忆（按重要性和时间排序）
   */
  getTopMemories(n = 10) {
    // 排序策略：用户主动添加的优先 > 高重要性 > 最近更新
    const sorted = [...this._memories].sort((a, b) => {
      // 1. 用户主动添加的优先
      if (a.source === 'user_explicit' && b.source !== 'user_explicit') return -1;
      if (b.source === 'user_explicit' && a.source !== 'user_explicit') return 1;
      // 2. 重要性排序
      const impOrder = { high: 3, medium: 2, low: 1 };
      const impDiff = (impOrder[b.importance] || 2) - (impOrder[a.importance] || 2);
      if (impDiff !== 0) return impDiff;
      // 3. 最近更新的优先
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return sorted.slice(0, n);
  }

  /**
   * 获取结构化的记忆摘要（用于 prompt 注入）
   */
  getStructuredSummary(n = 10) {
    const top = this.getTopMemories(n);
    if (top.length === 0) return '';

    const grouped = {};
    for (const mem of top) {
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
        summary += `  ${marker} ${m.content}\n`;
      }
    }
    return summary;
  }

  /**
   * 格式化记忆列表（用于用户查看）
   */
  formatMemoriesForDisplay() {
    if (this._memories.length === 0) {
      return '我还没有记住关于你的任何信息呢~ 你可以对我说"记住..."来让我记住重要的事情！';
    }

    const grouped = {};
    for (const mem of this._memories) {
      const cat = mem.category || 'fact';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(mem);
    }

    let text = `我一共记住了 ${this._memories.length} 条关于你的信息：\n\n`;
    for (const [cat, mems] of Object.entries(grouped)) {
      const catInfo = CATEGORIES[cat] || { icon: '📎', label: cat };
      text += `**${catInfo.icon} ${catInfo.label}** (${mems.length}条)\n`;
      for (const m of mems) {
        const source = m.source === 'user_explicit' ? '📌' : '🤖';
        text += `${source} ${m.content}\n`;
      }
      text += '\n';
    }
    text += '> 📌 = 你告诉我的 | 🤖 = 我从对话中学到的\n';
    text += '> 你可以说"忘记 xxx"来删除某条记忆';
    return text;
  }

  getAll() {
    return [...this._memories];
  }

  // ─── AI 提取记忆（通过 TriggerBus）──────────────────────────────────

  /**
   * 从对话中提取记忆（fire-and-forget）。
   * 只在用户消息 > 3 字符时触发（降低阈值以捕获短句偏好如"我喜欢看动漫"）。
   */
  async extractMemories(userMsg, assistantResp) {
    if (!userMsg || userMsg.length <= 3) return;
    if (!this._triggerBus) return;

    // 如果用户消息已经被识别为记忆管理意图，跳过自动提取
    const intent = this.detectMemoryIntent(userMsg);
    if (intent) return;

    try {
      const trigger = {
        type: 'memory',
        sceneId: 'memory.extract',
        payload: {
          userMessage: userMsg,
          assistantResponse: assistantResp,
          existingMemories: this._memories.map(m => m.content).join('; '),
        },
      };

      const result = await this._triggerBus.submitAndWait(trigger, { priority: 'LOW' });

      if (result.status !== 'completed' || !result.result) return;

      const content = result.result;

      // 解析 JSON 响应
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const facts = JSON.parse(jsonStr);
      if (!Array.isArray(facts)) return;

      for (const item of facts) {
        if (!item.content || typeof item.content !== 'string') {
          // 兼容旧格式的 fact 字段
          if (item.fact && typeof item.fact === 'string') {
            item.content = item.fact;
          } else {
            continue;
          }
        }

        const category = CATEGORY_KEYS.includes(item.category) ? item.category : 'fact';
        const importance = ['high', 'medium', 'low'].includes(item.importance) ? item.importance : 'medium';

        await this.addExtractedMemory(item.content, category, importance);
      }
    } catch (e) {
      console.warn('[MemoryManager] Memory extraction failed:', e.message);
    }
  }

  // ─── 内部工具方法 ──────────────────────────────────────────────────

  /**
   * 自动分类记忆内容
   */
  _autoClassify(content) {
    const lower = content.toLowerCase();

    // 个人信息关键词
    if (/(?:我叫|我的名字|我是|my name|i am|i'm|生日|birthday|年龄|age|住在|live in|来自|from)/.test(lower)) {
      return 'user_info';
    }

    // 偏好关键词
    if (/(?:喜欢|不喜欢|偏好|习惯|prefer|like|dislike|favorite|always|never|风格|style)/.test(lower)) {
      return 'preference';
    }

    // 指令关键词
    if (/(?:以后|从现在|不要|always|never|from now|going forward|请.*用|请.*不要|规则|rule)/.test(lower)) {
      return 'instruction';
    }

    // 关系关键词
    if (/(?:我们|你和我|our|we|之间|relationship|朋友|friend)/.test(lower)) {
      return 'relationship';
    }

    return 'fact';
  }

  /**
   * 查找相似记忆（用于合并/去重）
   */
  _findSimilar(content) {
    if (!content) return null;
    const lower = content.toLowerCase();

    for (const mem of this._memories) {
      const memLower = mem.content.toLowerCase();

      // 完全匹配
      if (memLower === lower) return mem;

      // 高相似度匹配（一个包含另一个的 80% 以上）
      if (lower.length > 5 && memLower.length > 5) {
        if (memLower.includes(lower) || lower.includes(memLower)) {
          return mem;
        }
      }

      // 关键词重叠度检测
      const wordsA = new Set(lower.split(/[\s,，。.!！?？]+/).filter(w => w.length > 1));
      const wordsB = new Set(memLower.split(/[\s,，。.!！?？]+/).filter(w => w.length > 1));
      if (wordsA.size > 2 && wordsB.size > 2) {
        const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
        const similarity = overlap / Math.min(wordsA.size, wordsB.size);
        if (similarity >= 0.7) return mem;
      }
    }

    return null;
  }

  /**
   * 从内容中提取标签
   */
  _extractTags(content) {
    if (!content) return [];
    // 提取关键名词/短语作为标签
    const tags = [];
    const words = content.split(/[\s,，。.!！?？：:]+/).filter(w => w.length >= 2 && w.length <= 10);
    // 取前 5 个有意义的词作为标签
    for (const word of words.slice(0, 5)) {
      if (!/^(?:我|你|的|了|是|在|有|和|也|都|就|不|这|那|会|要|能|可以|the|a|an|is|are|was|were|to|of|in|for|and|or)$/i.test(word)) {
        tags.push(word);
      }
    }
    return tags;
  }

  /**
   * 强制记忆数量上限（优先淘汰低重要性的 AI 提取记忆）
   */
  _enforceLimit() {
    if (this._memories.length <= MAX_MEMORIES) return;

    // 排序：保留用户主动添加的 + 高重要性的 + 最近的
    this._memories.sort((a, b) => {
      // 用户主动添加的永远保留
      if (a.source === 'user_explicit' && b.source !== 'user_explicit') return -1;
      if (b.source === 'user_explicit' && a.source !== 'user_explicit') return 1;
      // 高重要性保留
      const impOrder = { high: 3, medium: 2, low: 1 };
      const impDiff = (impOrder[b.importance] || 2) - (impOrder[a.importance] || 2);
      if (impDiff !== 0) return impDiff;
      // 最近更新的保留
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    this._memories = this._memories.slice(0, MAX_MEMORIES);
  }

  async _save() {
    await window.electronAPI.setStore('aiMemories', this._memories);
  }
}

// 导出分类定义供 UI 使用
export { CATEGORIES, CATEGORY_KEYS };
