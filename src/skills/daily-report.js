/**
 * Daily Report Skill
 *
 * Runs in main process. Reads today's converted text and
 * generates a Markdown daily report via AI.
 * Stores as `dailyReport_{date}` in electron-store.
 */

class DailyReport {
  /**
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   */
  constructor(store, aiClient) {
    this._store = store;
    this._aiClient = aiClient;
  }

  async execute() {
    const today = new Date().toISOString().split('T')[0];
    const convertedTextRaw = this._store.get(`convertedText_${today}`) || '';
    const convertedText = typeof convertedTextRaw === 'string'
      ? convertedTextRaw
      : convertedTextRaw.text || '';

    if (!convertedText || convertedText.trim().length < 20) {
      return { success: false, reason: 'insufficient-data' };
    }

    // Gather additional context
    const todos = this._store.get('todos') || [];
    const pomodoroStats = this._store.get('pomodoroStats') || { count: 0 };
    const rhythmData = this._store.get(`rhythmData_${today}`) || null;
    
    // V2 Pillar C: 获取内容分段 (仅 Pillar C 授权后)
    let contentSections = null;
    if (this._store.get('contentConsentGranted', false)) {
      const segments = this._store.get(`segments_${today}`);
      if (segments && segments.length > 0) {
        // 不传原始文本给 AI，只传结构化摘要
        contentSections = segments.map(s => ({
          time: `${s.startTime.slice(0,5)}-${s.endTime.slice(0,5)}`,
          type: s.type,
          lang: s.lang,
          density: s.density,
          charCount: s.charCount,
          summary: s.summary,
          // 只传前100字作为上下文，不传完整内容
          preview: s.lines.slice(0, 3).join(' ').slice(0, 100)
        }));
      }
    }

    const todayTodos = todos.filter(t => {
      if (!t.createdAt) return false;
      return new Date(t.createdAt).toISOString().split('T')[0] === today;
    });

    const completedTodos = todayTodos.filter(t => t.completed);

    const prompt = `你是 ChatCat 🐱，一只懂用户工作节奏的AI猫咪。请根据以下用户今天的打字记录和工作节奏数据，用温暖的猫咪语气生成一份简洁的 Markdown 格式日报。

要求：
1. 自动分类工作内容（会议、编码、写作、沟通等）
2. 突出心流时段和成就感，200字以内
3. 如果有卡壳事件，用安慰的语气
4. 给出1条基于数据的具体建议
5. 用猫咪的口吻（喵～、爪爪、~等）

今日打字内容：
${convertedText.substring(0, 3000)}

今日待办完成情况：
- 总计 ${todayTodos.length} 项，完成 ${completedTodos.length} 项
${todayTodos.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n')}

番茄钟完成数：${pomodoroStats.count || 0}

节奏数据：
${JSON.stringify(rhythmData || {}, null, 2)}

内容概要：
${contentSections ? JSON.stringify(contentSections, null, 2) : '无详细内容分段数据（未授权或无数据）'}

请生成日报：`;

    try {
      const apiConfig = this._getAIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, reason: 'no-api-key' };
      }

      const report = await this._callAI(apiConfig, prompt);

      // Store the report
      this._store.set(`dailyReport_${today}`, {
        content: report,
        generatedAt: Date.now(),
        date: today
      });

      return {
        success: true,
        report,
        notification: {
          signal: 'time-trigger',
          data: { hour: new Date().getHours(), type: 'daily-report-ready' }
        }
      };
    } catch (err) {
      console.warn('[DailyReport] AI call failed:', err.message);
      return { success: false, reason: 'ai-error', error: err.message };
    }
  }

}

module.exports = { DailyReport };
