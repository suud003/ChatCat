/**
 * Text Converter Skill
 *
 * Runs in main process. Reads keyboard recorder data for the current day,
 * calls AI API to convert keystroke records into readable text.
 * Filters sensitive scenarios (password input detection).
 *
 * Stores output as `convertedText_{date}` in electron-store.
 */

class TextConverter {
  /**
   * @param {import('electron-store')} store
   * @param {import('./keyboard-recorder').KeyboardRecorder} keyboardRecorder
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   */
  constructor(store, keyboardRecorder, aiClient) {
    this._store = store;
    this._recorder = keyboardRecorder;
    this._aiClient = aiClient;
  }

  async execute(aiService) {
    const today = new Date().toISOString().split('T')[0];
    const storeKey = `convertedText_${today}`;

    // Get today's recorder content
    let rawContent = '';
    if (this._recorder) {
      rawContent = this._recorder.getTodayContent(200) || '';
    }

    if (!rawContent || rawContent.trim().length < 10) {
      return { success: false, reason: 'insufficient-data' };
    }

    // Filter potential sensitive input (password fields, etc.)
    // V2 Pillar C: 确认内容已经过敏感过滤（由 KeyboardRecorder 保证）
    // 额外校验: 二次过滤（双保险）
    const safeContent = this._secondPassFilter(rawContent);
    
    if (!safeContent || safeContent.trim().length < 10) {
      return { success: false, reason: 'filtered-sensitive' };
    }

    // Call AI to convert keystrokes to readable text
    const prompt = `你是一个打字记录分析器。以下是用户的键盘输入记录（包含按键码和时间戳），请将其还原为可读的文本段落。
注意：
1. 拼音输入法的连续字母应还原为中文
2. 忽略功能键（Ctrl、Alt等）
3. 识别并分段不同的输入上下文
4. 如果无法确定内容，标记为[不确定]
5. 输出纯文本，不需要格式化
6. 增强指令: 如果一行明显是代码（有缩进、函数调用、分号结尾等），保留原样不转换；如果一行是终端命令（以 $ 或 > 开头，或包含 npm/git/docker 等），保留原样；只对自然语言部分进行拼音→中文转换；对代码注释中的拼音进行转换。

键盘记录：
${safeContent}`;

    try {
      const apiConfig = this._getAIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, reason: 'no-api-key' };
      }

      const response = await this._callAI(apiConfig, prompt);

      const existingObj = this._store.get(storeKey) || { text: '' };
      const existingText = typeof existingObj === 'string' ? existingObj : existingObj.text;
      
      const updatedText = existingText
        ? existingText + '\n\n--- ' + new Date().toLocaleTimeString() + ' ---\n' + response
        : response;

      // V2 Pillar C: 存储转换结果时标记已清洗
      this._store.set(storeKey, {
        text: updatedText,
        cleaned: true,
        timestamp: Date.now(),
        rawLines: rawContent.split('\n').length
      });
      
      // 触发分段事件 (由 main.js 监听处理)
      if (this.onConversionComplete) {
         this.onConversionComplete(today, updatedText);
      }

      return { success: true, text: response };
    } catch (err) {
      console.warn('[TextConverter] AI call failed:', err.message);
      return { success: false, reason: 'ai-error', error: err.message };
    }
  }

  // 修改原来的 _filterSensitive
  _secondPassFilter(content) {
    // 双保险：即使 KeyboardRecorder 遗漏，这里再过滤一次
    const lines = content.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      // Skip empty lines
      if (!trimmed) return true;
      // 跳过已标记为 FILTERED 的行
      if (line.includes('[FILTERED') || line.includes('[HASH:')) return false;
      // Skip lines that are all dots/asterisks (password fields)
      if (/^[.•*●]+$/.test(trimmed)) return false;
      // Skip lines containing common sensitive field indicators
      if (/password|passwd|密码|token|secret/i.test(trimmed)) return false;
      return true;
    }).join('\n');
  }

}

module.exports = { TextConverter };
