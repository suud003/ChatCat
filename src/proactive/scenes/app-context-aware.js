/**
 * Scene: App Context Aware — L2/L3 proactive notifications
 * Reacts to active window / app switches to provide contextual interactions.
 * All messages are AI-generated via TriggerBus (no preset replies).
 *
 * Trigger logic: first visit OR per-category "away time" >= 20 min.
 *
 * | Trigger               | Condition                                    | Behavior                                 | Level |
 * |-----------------------|----------------------------------------------|------------------------------------------|-------|
 * | app-switch            | First visit or 20+ min away from coding      | Coding encouragement                     | L2    |
 * | app-switch            | First visit or 20+ min away from browser     | Browsing comment                         | L2    |
 * | app-switch            | First visit or 20+ min away from communication| Communication awareness                  | L2    |
 * | app-switch            | Frequent switching (>5 in 5min)              | Focus suggestion                         | L3    |
 * | app-switch            | 30+ min away from coding                     | Detailed welcome back                    | L2    |
 */

// Known app categories
const CODING_APPS = ['code', 'vscode', 'idea', 'webstorm', 'pycharm', 'vim', 'nvim', 'sublime_text', 'atom', 'cursor', 'windsurf', 'notepad++'];
const BROWSER_APPS = ['chrome', 'firefox', 'edge', 'safari', 'opera', 'brave', 'arc'];
const COMMUNICATION_APPS = ['slack', 'teams', 'discord', 'telegram', 'wechat', 'weixin', 'qq', 'zoom', 'dingtalk', 'feishu', 'lark'];
const DESIGN_APPS = ['figma', 'sketch', 'photoshop', 'illustrator', 'xd', 'canva'];
const TERMINAL_APPS = ['terminal', 'iterm2', 'windowsterminal', 'powershell', 'cmd', 'warp', 'alacritty', 'hyper'];

function categorizeApp(appName) {
  if (!appName) return 'unknown';
  const lower = appName.toLowerCase();
  if (CODING_APPS.some(a => lower.includes(a))) return 'coding';
  if (BROWSER_APPS.some(a => lower.includes(a))) return 'browser';
  if (COMMUNICATION_APPS.some(a => lower.includes(a))) return 'communication';
  if (DESIGN_APPS.some(a => lower.includes(a))) return 'design';
  if (TERMINAL_APPS.some(a => lower.includes(a))) return 'terminal';
  return 'other';
}

// Minimum away time (minutes) to trigger a notification for returning to a category
const MIN_AWAY_MINUTES = 20;

// ─── Scene: Coding App Switch ───────────────────────────────────────────

export const appSwitchCodingScene = {
  id: 30,
  name: 'app-switch-coding',
  type: 'chat',
  level: 'L2',
  signal: 'app-switch',
  aiGenerate: true,
  aiHint: (ctx) => {
    const app = ctx.appName || '编辑器';
    if (ctx.isFirstVisit) {
      return `用户刚打开了 ${app}（编码工具），这是本次会话第一次使用编码类应用。请用一句话打个招呼，语气自然，不要提"离开多久"。`;
    }
    return `用户回到了 ${app}（编码工具），之前离开了一段时间。请用一句话简短鼓励，语气自然。`;
  },
  condition: (ctx) => {
    return ctx.appCategory === 'coding' && (ctx.isFirstVisit || ctx.categoryAwayMinutes >= MIN_AWAY_MINUTES);
  },
  // Fallback if AI unavailable
  getMessage: (ctx) => {
    const app = ctx.appName || '编辑器';
    return `💻 切到 ${app} 了！加油~`;
  },
  actions: [],
  cooldown: 5 * 60 * 1000
};

// ─── Scene: Browser Switch ──────────────────────────────────────────────

export const appSwitchBrowserScene = {
  id: 301,
  name: 'app-switch-browser',
  type: 'chat',
  level: 'L2',
  signal: 'app-switch',
  aiGenerate: true,
  aiHint: (ctx) => {
    const app = ctx.appName || '浏览器';
    if (ctx.isFirstVisit) {
      return `用户刚打开了 ${app}（浏览器），这是本次会话第一次使用浏览器。请用一句话打个招呼，语气自然，不要提"离开多久"。`;
    }
    return `用户回到了 ${app}（浏览器），之前离开了一段时间。请用一句话简短评论，语气自然。`;
  },
  condition: (ctx) => {
    return ctx.appCategory === 'browser' && (ctx.isFirstVisit || ctx.categoryAwayMinutes >= MIN_AWAY_MINUTES);
  },
  getMessage: (ctx) => {
    return '🌐 去查资料了？找到答案记得回来哦~';
  },
  actions: [],
  cooldown: 5 * 60 * 1000
};

// ─── Scene: Communication App Switch ────────────────────────────────────

export const appSwitchCommScene = {
  id: 302,
  name: 'app-switch-communication',
  type: 'chat',
  level: 'L2',
  signal: 'app-switch',
  aiGenerate: true,
  aiHint: (ctx) => {
    const app = ctx.appName || '聊天工具';
    if (ctx.isFirstVisit) {
      return `用户刚打开了 ${app}（通讯工具），这是本次会话第一次使用通讯类应用。请用一句话打个招呼，语气自然，不要提"离开多久"。`;
    }
    return `用户回到了 ${app}（通讯工具），之前离开了一段时间。请用一句话简短评论，语气自然。`;
  },
  condition: (ctx) => {
    return ctx.appCategory === 'communication' && (ctx.isFirstVisit || ctx.categoryAwayMinutes >= MIN_AWAY_MINUTES);
  },
  getMessage: (ctx) => {
    const app = ctx.appName || '聊天';
    return `💬 去 ${app} 看消息啦~`;
  },
  actions: [],
  cooldown: 5 * 60 * 1000
};

// ─── Scene: Frequent App Switching (focus loss) ─────────────────────────

export const appSwitchFrequentScene = {
  id: 303,
  name: 'app-switch-frequent',
  type: 'efficiency',
  level: 'L3',
  signal: 'app-switch',
  aiGenerate: true,
  aiHint: (ctx) => {
    const count = ctx.switchCount || 5;
    return `用户在 5 分钟内切换了 ${count} 次应用，注意力可能比较分散。请温柔地提醒用户专注，可以建议使用番茄钟，语气自然简短。`;
  },
  condition: (ctx) => {
    return ctx.switchCount >= 5;
  },
  getMessage: (ctx) => {
    return '🔄 切换好多次了~ 要不要集中一下？';
  },
  actions: [
    { label: '开始番茄钟', action: 'start-pomodoro' },
    { label: '知道了', action: 'dismiss' }
  ],
  cooldown: 15 * 60 * 1000
};

// ─── Scene: Return to coding after very long time ───────────────────────

export const appSwitchReturnCodingScene = {
  id: 304,
  name: 'app-switch-return-coding',
  type: 'care',
  level: 'L2',
  signal: 'app-switch',
  aiGenerate: true,
  aiHint: (ctx) => {
    const app = ctx.appName || '编辑器';
    const apps = ctx.awayApps?.length > 0 ? ctx.awayApps.slice(0, 3).join('、') : '其他应用';
    return `用户离开编辑器较长时间后回到了 ${app}。这段时间在用 ${apps}。请给一句简短的欢迎回来+鼓励，语气自然，不要说具体时间。`;
  },
  condition: (ctx) => {
    return ctx.appCategory === 'coding' && !ctx.isFirstVisit && ctx.categoryAwayMinutes >= 30;
  },
  getMessage: (ctx) => {
    return '💻 欢迎回来~ 继续加油！';
  },
  actions: [],
  cooldown: 5 * 60 * 1000
};

export const appContextScenes = [
  appSwitchCodingScene,
  appSwitchBrowserScene,
  appSwitchCommScene,
  appSwitchFrequentScene,
  appSwitchReturnCodingScene,
];

export { categorizeApp };
