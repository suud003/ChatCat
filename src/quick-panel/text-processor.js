class TextProcessor {
  constructor(store) {
    this._store = store;
  }

  buildPrompt(mode, text) {
    const templates = {
      polish: {
        system: `你是一个专业的文本润色助手。
要求：
1. 保持原意不变，提升表达质量
2. 修正语法和错别字
3. 使措辞更加专业、得体
4. 如果是中文则保持中文，如果是英文则保持英文
5. 只输出润色后的文本，不要解释`,
        user: `请润色以下文本：\n\n${text}`
      },
      
      summarize: {
        system: `你是一个专业的内容总结助手。
要求：
1. 提取核心要点，用简洁的条目列出
2. 保留关键信息，忽略细枝末节
3. 如果内容较长，分层级总结
4. 用中文输出（除非原文是英文）
5. 格式：使用 • 符号列出要点`,
        user: `请总结以下内容的核心要点：\n\n${text}`
      },
      
      explain: {
        system: `你是一个耐心的教学助手，擅长用通俗易懂的方式解释概念。
要求：
1. 先给出一句话简明解释
2. 然后用"举个例子"补充说明
3. 如果是代码，逐行注释关键逻辑
4. 如果是专业术语，类比日常概念
5. 控制在200字以内`,
        user: `请解释以下内容：\n\n${text}`
      }
    };
    
    return templates[mode] || templates.polish;
  }
  
  // AI 调用配置
  getModelConfig(mode) {
    // 润色和总结用快速模型，解释可以用稍好的模型
    return {
      temperature: mode === 'polish' ? 0.3 : mode === 'explain' ? 0.5 : 0.4,
      maxTokens: mode === 'summarize' ? 500 : 800,
    };
  }
}

module.exports = { TextProcessor };
