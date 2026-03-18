class SensitiveFilter {
  constructor() {
    // 关键词黑名单 (不区分大小写)
    this._keywords = [
      // 密码类
      'password', 'passwd', 'pwd', '密码', '口令',
      // 令牌类
      'token', 'secret', 'api_key', 'apikey', 'api-key',
      'access_key', 'accesskey', 'secret_key', 'secretkey',
      // 凭证类
      'private_key', 'privatekey', 'credential',
      'authorization', 'bearer',
      // 数据库
      'connection_string', 'connectionstring',
      // 金融
      '银行卡', '信用卡', '身份证',
    ];
    
    // 密文模式
    this._cipherRegex = /^[•*●◆█]+$/;
    
    // 长无意义串 (40+字符无空格)
    this._hashRegex = /\S{40,}/;
    
    this._compileRegex();
  }
  
  _compileRegex() {
    this._keywordRegex = new RegExp(
      this._keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      'i'
    );
  }
  
  /**
   * 允许动态添加自定义敏感词
   */
  addCustomKeywords(keywords) {
    if (!Array.isArray(keywords) || keywords.length === 0) return;
    this._keywords = [...new Set([...this._keywords, ...keywords])];
    this._compileRegex();
  }

  /**
   * 过滤一行文本
   * @param {string} line - 原始行
   * @returns {string|null} - 过滤后的行，null 表示整行丢弃
   */
  filterLine(line) {
    if (!line || !line.trim()) return line;
    
    const trimmed = line.trim();
    
    // 1. 纯密文行 → 丢弃
    if (this._cipherRegex.test(trimmed)) {
      return null;
    }
    
    // 2. 关键词匹配 → 替换整行，或者隐藏敏感部分，这里为了安全选择直接替换。
    if (this._keywordRegex.test(trimmed)) {
      const matchedKeyword = trimmed.match(this._keywordRegex)?.[0] || 'sensitive';
      return `[FILTERED: 包含敏感关键词 ${matchedKeyword}]`;
    }
    
    // 3. 长无意义串 → 截断
    if (this._hashRegex.test(trimmed)) {
      // 检查这一行是否完全是由长串构成（剔除时间戳等前缀影响）
      // 如果去除了被判定为Hash的字符串后，剩下的有效内容不足（比如只有标点或极短），则直接丢弃整行
      const stripped = trimmed.replace(this._hashRegex, '').trim();
      if (stripped.length < 5 && !/[a-zA-Z\u4e00-\u9fa5]/.test(stripped)) {
        return null;
      }
      
      // 否则将长串替换为空字符串或提示，这里用户选择了完全丢弃不显示占位符
      return trimmed.replace(this._hashRegex, '').trim() || null;
    }
    
    // 4. 安全行 → 通过
    return line;
  }
  
  /**
   * 批量过滤多行文本
   * @param {string} text - 多行文本
   * @returns {string} - 过滤后的文本
   */
  filterText(text) {
    if (!text) return text;
    
    return text.split('\n')
      .map(line => this.filterLine(line))
      .filter(line => line !== null)  // 丢弃 null 行
      .join('\n');
  }
  
  /**
   * 统计过滤结果
   */
  getStats(text) {
    const lines = text.split('\n');
    let filtered = 0;
    let discarded = 0;
    let hashed = 0;
    
    for (const line of lines) {
      const result = this.filterLine(line);
      if (result === null) discarded++;
      else if (result.startsWith('[FILTERED')) filtered++;
      else if (result.includes('[HASH:')) hashed++;
    }
    
    return { total: lines.length, filtered, discarded, hashed, passed: lines.length - filtered - discarded - hashed };
  }
}

module.exports = { SensitiveFilter };