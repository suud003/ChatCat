class ContentSegmenter {
  constructor(store) {
    this._store = store;
    
    // 分段阈值
    this._pauseThresholdMinutes = 5;  // 暂停>5分钟视为新段
    
    // 代码检测模式
    this._codePatterns = [
      /^[\s]*[{}()\[\]]/,           // 括号开头
      /;\s*$/,                       // 分号结尾
      /^\s*(const|let|var|function|class|import|export|return|if|else|for|while)\b/,
      /^\s*(def|async|await|print|try|except|catch|throw)\b/,
      /^\s*\/\//,                    // 注释
      /^\s*#(?!#)/,                  // Python 注释
      /^\s*\*/,                      // 多行注释
      /[=!<>]{2,}/,                  // 运算符
      /\.\w+\(/,                     // 方法调用
    ];
    
    // 聊天模式检测
    this._chatPatterns = [
      /^(哈哈|嗯嗯|好的|收到|OK|ok|谢谢|嗯|对|是的|没问题)/,
      /[？?！!~～]{2,}/,             // 多个感叹号/问号
      /^@\w/,                        // @某人
    ];
  }
  
  /**
   * 对已转换的文本进行分段
   * @param {string} convertedText - 已转换的可读文本
   * @param {string} date - 日期 YYYY-MM-DD
   * @returns {Array<Segment>} - 分段结果
   */
  segment(convertedText, date) {
    if (!convertedText) return [];
    
    const lines = convertedText.split('\n');
    const segments = [];
    let currentSegment = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 解析时间戳 (格式: [HH:MM:SS] content)
      const timeMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)/);
      const time = timeMatch ? timeMatch[1] : null;
      const content = timeMatch ? timeMatch[2] : trimmed;
      
      if (!content.trim()) continue;
      
      // 判断是否需要开启新段
      if (this._shouldStartNewSegment(currentSegment, time)) {
        if (currentSegment) {
          this._finalizeSegment(currentSegment);
          segments.push(currentSegment);
        }
        currentSegment = this._createSegment(time, date);
      }
      
      // 添加内容到当前段
      if (!currentSegment) {
        currentSegment = this._createSegment(time, date);
      }
      
      currentSegment.lines.push(content);
      currentSegment.charCount += content.length;
      currentSegment.endTime = time || currentSegment.endTime;
      
      // 累计类型投票
      if (this._isCodeLine(content)) {
        currentSegment._codeVotes++;
      } else if (this._isChatLine(content)) {
        currentSegment._chatVotes++;
      } else {
        currentSegment._textVotes++;
      }
    }
    
    // 最后一个段
    if (currentSegment) {
      this._finalizeSegment(currentSegment);
      segments.push(currentSegment);
    }
    
    // 存储
    const storeKey = `segments_${date}`;
    this._store.set(storeKey, segments);
    
    // 清理过期数据
    this._cleanOldSegments().catch(console.error);
    
    return segments;
  }
  
  _createSegment(time, date) {
    return {
      startTime: time || '00:00:00',
      endTime: time || '00:00:00',
      type: 'text',      // code | text | chat
      lang: 'mixed',     // zh | en | mixed
      density: 'medium', // high | medium | low
      charCount: 0,
      lines: [],
      summary: '',
      _codeVotes: 0,
      _textVotes: 0,
      _chatVotes: 0,
    };
  }
  
  _shouldStartNewSegment(current, newTime) {
    if (!current || !newTime) return !current;
    
    // 解析时间差
    const [ch, cm, cs] = current.endTime.split(':').map(Number);
    const [nh, nm, ns] = newTime.split(':').map(Number);
    const diffMinutes = (nh * 60 + nm) - (ch * 60 + cm);
    
    return diffMinutes >= this._pauseThresholdMinutes;
  }
  
  _finalizeSegment(segment) {
    // 确定类型 (投票制)
    const maxVotes = Math.max(segment._codeVotes, segment._textVotes, segment._chatVotes);
    if (maxVotes === 0) {
      segment.type = 'text';
    } else if (segment._codeVotes === maxVotes) {
      segment.type = 'code';
    } else if (segment._chatVotes === maxVotes) {
      segment.type = 'chat';
    } else {
      segment.type = 'text';
    }
    
    // 确定语言
    const allText = segment.lines.join(' ');
    const zhCount = (allText.match(/[\u4e00-\u9fff]/g) || []).length;
    const enCount = (allText.match(/[a-zA-Z]/g) || []).length;
    if (zhCount > enCount * 2) segment.lang = 'zh';
    else if (enCount > zhCount * 2) segment.lang = 'en';
    else segment.lang = 'mixed';
    
    // 确定密度
    const [sh, sm, sss] = segment.startTime.split(':').map(Number);
    const [eh, em, ess] = segment.endTime.split(':').map(Number);
    const durationMin = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
    const charsPerMin = segment.charCount / durationMin;
    
    if (charsPerMin > 50) segment.density = 'high';
    else if (charsPerMin > 20) segment.density = 'medium';
    else segment.density = 'low';
    
    // 生成摘要 (纯本地规则，0 token)
    const typeLabels = { code: '编码', text: '文字输入', chat: '聊天' };
    const startShort = segment.startTime.slice(0, 5);
    const endShort = segment.endTime.slice(0, 5);
    segment.summary = `${startShort}-${endShort} ${typeLabels[segment.type]} ${segment.charCount}字`;
    
    // 清理内部投票字段
    delete segment._codeVotes;
    delete segment._textVotes;
    delete segment._chatVotes;
  }
  
  _isCodeLine(text) {
    return this._codePatterns.some(p => p.test(text));
  }
  
  _isChatLine(text) {
    return this._chatPatterns.some(p => p.test(text)) && text.length < 30;
  }
  
  async _cleanOldSegments() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 清理前 8 到 40 天的数据
    for (let i = 8; i < 40; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `segments_${d.toISOString().split('T')[0]}`;
      this._store.delete(key);
    }
  }
}

module.exports = { ContentSegmenter };