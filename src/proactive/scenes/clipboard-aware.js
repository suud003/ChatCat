/**
 * Scene 24: Clipboard Aware — L0/L1 notifications
 * Reacts to clipboard content changes.
 *
 * | Content       | Condition              | Behavior                                | Level |
 * |--------------|------------------------|-----------------------------------------|-------|
 * | URL          | Contains http(s)://     | Suggest saving as note                  | L1    |
 * | Code         | Contains code patterns  | Encouragement                           | L0    |
 * | Long text    | >200 chars              | Comment                                 | L0    |
 * | Repeat copy  | Same content ≥3 times   | Suggest saving as template              | L1    |
 */

export const clipboardUrlScene = {
  id: 24,
  name: 'clipboard-url',
  type: 'efficiency',
  level: 'L1',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'url' && !ctx.isRepeat,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '🔗 复制了一个链接！要用 /note 保存起来吗？',
        '🌐 发现一个 URL！要记下来吗？/note 帮你保存~',
        '📎 这个链接看起来很重要！/note 一键保存~'
      ],
      cool: [
        '一个链接。要存吗？/note',
        '...URL。需要记录的话用 /note。',
        '链接已检测。自己决定存不存。'
      ],
      soft: [
        '🌸 复制了一个链接呢~ 要记下来吗？',
        '🌸 这个链接要保存起来吗？猫咪帮你记~',
        '🌸 用 /note 保存这个链接吧~ 以后好找~'
      ],
      scholar: [
        '🔗 检测到 URL。建议使用 /note 存档以便后续引用。',
        '📌 知识管理建议：重要链接应及时归档。/note <描述>',
        '🗂️ 链接捕获。建议附加标签后存入笔记。'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 5 * 60 * 1000 // 5 minutes
};

export const clipboardCodeScene = {
  id: 241,
  name: 'clipboard-code',
  type: 'chat',
  level: 'L0',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'code',
  getMessage: (ctx, personality) => {
    const messages = {
      lively: ['💻 在研究代码呀~ 加油！'],
      cool: ['...代码。'],
      soft: ['🌸 在看代码呢~ 好厉害~'],
      scholar: ['📝 代码片段已检测。']
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 15 * 60 * 1000 // 15 minutes
};

export const clipboardLongTextScene = {
  id: 242,
  name: 'clipboard-long-text',
  type: 'chat',
  level: 'L0',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'text' && ctx.length > 200,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: ['📋 复制了好多内容！是在整理资料吗？'],
      cool: ['...复制了不少。'],
      soft: ['🌸 好多内容呢~ 辛苦整理了~'],
      scholar: [`📊 ${ctx.length} 字符已复制。建议核实内容完整性。`]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 10 * 60 * 1000 // 10 minutes
};

export const clipboardRepeatScene = {
  id: 243,
  name: 'clipboard-repeat',
  type: 'efficiency',
  level: 'L1',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.isRepeat,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '🔄 这段内容用了好多次！要不要保存成笔记方便用？',
        '📌 又复制了同样的内容~ 用 /note 存起来随时取用！',
        '😮 这个内容你已经复制了好几次了！固定下来吧？'
      ],
      cool: [
        '同样的内容...第3次了。存下来吧。/note',
        '重复复制。建议保存。',
        '...又是这个。/note 存一下。'
      ],
      soft: [
        '🌸 这段内容用了好多次呢~ 保存起来会方便很多~',
        '🌸 猫咪注意到你经常用这段内容~ 要存成笔记吗？',
        '🌸 重复的内容~ 用 /note 记下来吧~'
      ],
      scholar: [
        `📊 检测到同一内容被复制 ${ctx.repeatCount} 次。建议创建快捷模板。`,
        '🗂️ 重复使用的文本应该保存为模板，提升效率。',
        '📌 高频使用内容检测。建议 /note 永久保存。'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 30 * 60 * 1000 // 30 minutes
};
