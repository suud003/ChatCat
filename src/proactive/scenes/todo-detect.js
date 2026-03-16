/**
 * Scene 2: Todo Suggest — L2 notification
 * Periodically asks user if they want to extract todos from today's typing.
 * Triggered by periodic signal (every 30s), cooldown controlled by user setting.
 * If user clicks "好的", triggers todo-management skill via extract-todo action.
 */

export const todoDetectScene = {
  id: 2,
  name: 'todo-suggest',
  type: 'efficiency',
  level: 'L3',
  signal: 'periodic',
  condition: (ctx) => {
    // Quiet hours are already handled by TimingJudge, no extra hour restriction here
    return true;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: '📝 要猫咪帮你整理一下待办事项吗？我去看看你今天打了些什么~',
      cool: '...需要整理一下待办吗？',
      soft: '📝 猫咪想帮你整理一下今天的待办呢~ 好不好？',
      scholar: '📋 根据今日工作记录，是否需要提取待办事项？'
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '好的', action: 'extract-todo' },
    { label: '不用了', action: 'dismiss' }
  ],
  // Dynamic cooldown: reads user-configured interval from store (default 30 min)
  async getCooldown() {
    const minutes = await window.electronAPI.getStore('todoRemindInterval') || 30;
    return minutes * 60 * 1000;
  },
  cooldown: 30 * 60 * 1000 // fallback
};
