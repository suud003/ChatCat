const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qpAPI', {
  // 面板事件
  onPanelShow: (cb) => ipcRenderer.on('panel-show', (_, data) => cb(data)),
  onDisplayDirectResult: (cb) => ipcRenderer.on('qp-display-direct-result', (_, data) => cb(data)),
  
  // AI 处理请求
  processText: (mode, text) => ipcRenderer.invoke('qp-process-text', mode, text),
  
  // 流式结果接收
  onStreamChunk: (cb) => ipcRenderer.on('qp-stream-chunk', (_, chunk) => cb(chunk)),
  onStreamEnd: (cb) => ipcRenderer.on('qp-stream-end', (_, result) => cb(result)),
  onStreamError: (cb) => ipcRenderer.on('qp-stream-error', (_, err) => cb(err)),
  
  // 操作
  copyToClipboard: (text) => ipcRenderer.send('qp-copy', text),
  close: () => ipcRenderer.send('qp-close'),
  
  // 历史记录
  getHistory: () => ipcRenderer.invoke('qp-get-history'),
  
  // 多轮问答上下文
  askQuestion: (question, history) => ipcRenderer.invoke('qp-ask', question, history),

  startScreenshot: () => ipcRenderer.send('qp-screenshot'),
  sendFeedback: (data) => ipcRenderer.send('qp-feedback', data),

  // 粘贴图片识别
  recognizeImage: (base64) => ipcRenderer.invoke('qp-recognize-image', base64),

  // 从外部自动传入图片识别（猫咪气泡点击触发）
  onAutoRecognizeImage: (cb) => ipcRenderer.on('qp-auto-recognize-image', (_, data) => cb(data)),
});
