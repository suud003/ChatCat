/**
 * Scene 14: Todo Deadline Warning — L3 notification
 * Warns when a todo item is approaching its deadline (within 30 minutes).
 */

export const todoDeadlineScene = {
  id: 14,
  name: 'todo-deadline',
  type: 'efficiency',
  level: 'L3',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (!ctx.todoList) return false;
    // Check for todos with reminders due within 30 minutes
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    const todos = ctx.todoList.getTodos ? ctx.todoList.getTodos() : [];
    return todos.some(t =>
      !t.completed && t.reminderTime &&
      (t.reminderTime - now) > 0 &&
      (t.reminderTime - now) <= thirtyMin
    );
  },
  getMessage: (ctx, personality) => {
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    const todos = ctx.todoList.getTodos ? ctx.todoList.getTodos() : [];
    const urgent = todos.find(t =>
      !t.completed && t.reminderTime &&
      (t.reminderTime - now) > 0 &&
      (t.reminderTime - now) <= thirtyMin
    );
    const taskName = urgent ? urgent.text : '一个任务';

    const messages = {
      lively: `⏰ 紧急！"${taskName}" 快要到期了！赶紧完成吧~ (>^ω^<)`,
      cool: `⏰ "${taskName}" 快到 deadline 了。...加油吧。`,
      soft: `⏰ "${taskName}" 快到时间了~ 要抓紧完成哦~ 猫咪给你加油！(´・ω・\`)`,
      scholar: `⏰ 提醒：待办 "${taskName}" 将在 30 分钟内到期。时间管理很重要哦~`
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '知道了', action: 'dismiss' },
    { label: '查看待办', action: 'open-todo' }
  ],
  cooldown: 30 * 60 * 1000 // 30 minutes
};
