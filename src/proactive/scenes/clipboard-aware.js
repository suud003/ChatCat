/**
 * Scene 24: Clipboard Aware — L3 notifications with AI actions
 * Reacts to clipboard content changes.
 *
 * | Content       | Condition              | Behavior                                    | Level |
 * |--------------|------------------------|--------------------------------------------|-------|
 * | URL          | Contains http(s)://     | Suggest translate / polish / explain         | L3    |
 * | Code         | Contains code patterns  | Suggest translate / explain code             | L3    |
 * | Long text    | >200 chars              | Suggest translate / polish / explain         | L3    |
 * | Repeat copy  | Same content ≥3 times   | Suggest saving as template                   | L1    |
 */

const textActions = [
  { label: '🌐 翻译', action: 'clipboard-translate' },
  { label: '✨ 润色', action: 'clipboard-polish' },
  { label: '💡 解释', action: 'clipboard-explain' },
];
const codeActions = [
  { label: '🌐 翻译', action: 'clipboard-translate' },
  { label: '💡 解释代码', action: 'clipboard-explain' },
];

export const clipboardUrlScene = {
  id: 24,
  name: 'clipboard-url',
  type: 'efficiency',
  level: 'L3',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'url' && !ctx.isRepeat,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '🔗 复制了一个链接！要翻译、润色还是解释一下？',
        '🌐 发现一个 URL！猫猫可以帮你处理~',
        '📎 这个链接里的内容，要怎么处理呀？'
      ],
      cool: [
        '一个链接。要处理吗？',
        '...URL。翻译还是解释？',
        '链接已检测。自己选。'
      ],
      soft: [
        '🌸 复制了一个链接呢~ 要翻译或者解释吗？',
        '🌸 这个链接要处理一下吗？猫咪帮你~',
        '🌸 需要猫咪帮你翻译或润色吗~'
      ],
      scholar: [
        '🔗 检测到 URL。可以翻译、润色或解释内容。',
        '📌 链接捕获。选择一个操作吧。',
        '🗂️ 需要对链接内容进行什么处理？'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: textActions,
  cooldown: 30 * 1000 // 30 seconds
};

export const clipboardCodeScene = {
  id: 241,
  name: 'clipboard-code',
  type: 'chat',
  level: 'L3',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'code' && !ctx.isRepeat,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '💻 在研究代码呀~ 要翻译还是让猫猫解释一下？',
        '💻 代码！要帮你翻译或解释吗？',
      ],
      cool: [
        '...代码。翻译还是解释？',
        '代码片段。要处理吗。',
      ],
      soft: [
        '🌸 在看代码呢~ 要猫咪帮你翻译或解释吗？',
        '🌸 好多代码~ 需要帮忙吗？',
      ],
      scholar: [
        '📝 代码片段已检测。可翻译注释或逐行解释。',
        '💻 检测到代码。选择操作。',
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: codeActions,
  cooldown: 30 * 1000 // 30 seconds
};

export const clipboardLongTextScene = {
  id: 242,
  name: 'clipboard-long-text',
  type: 'chat',
  level: 'L3',
  signal: 'clipboard-content',
  condition: (ctx) => ctx.type === 'text' && ctx.length > 200,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '📋 好多内容！要翻译、润色还是解释一下？',
        '📋 复制了一大段！猫猫可以帮你处理~',
      ],
      cool: [
        '...复制了不少。要处理吗？',
        '一大段文字。翻译、润色还是解释。',
      ],
      soft: [
        '🌸 好多内容呢~ 要猫咪帮你翻译或润色吗？',
        '🌸 这么多字~ 需要帮忙处理吗？',
      ],
      scholar: [
        `📊 ${ctx.length} 字符已复制。可翻译、润色或解释。`,
        '📋 大段文本检测。选择操作。',
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: textActions,
  cooldown: 30 * 1000 // 30 seconds
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
  cooldown: 60 * 1000 // 60 seconds
};
