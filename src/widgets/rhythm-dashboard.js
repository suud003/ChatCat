export class RhythmDashboard {
  constructor(container, rhythmAnalyzer, compositeEngine) {
    this._container = container;
    this._analyzer = rhythmAnalyzer;
    this._engine = compositeEngine;
    this._updateTimer = null;
  }
  
  init() {
    this._render();
    
    // Initial update
    this._update();
    
    // Refresh frequently so realtime signals like mouse activity are visible immediately
    this._updateTimer = setInterval(() => this._update(), 2000);
    
    // Listen for state changes
    if (this._analyzer) {
      this._analyzer.on('rhythm-tick', (data) => {
        this._updateRealtimeSection(data);
      });
    }
  }
  
  _render() {
    this._container.innerHTML = `
      <div class="rhythm-dashboard">
        <div class="rhythm-realtime">
          <div class="rhythm-state-display">
            <span class="rhythm-state-icon" id="rhythm-icon">⏳</span>
            <div class="rhythm-state-info">
              <div class="rhythm-state-name" id="rhythm-name">等待中</div>
              <div class="rhythm-state-detail" id="rhythm-detail">开始打字后将显示状态</div>
            </div>
          </div>
          <div class="rhythm-meters">
            <div class="rhythm-meter">
              <span class="meter-label">打字速度</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-cpm"></div></div>
              <span class="meter-value" id="val-cpm">0 CPM</span>
            </div>
            <div class="rhythm-meter">
              <span class="meter-label">退格率</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-delete"></div></div>
              <span class="meter-value" id="val-delete">0%</span>
            </div>
            <div class="rhythm-meter">
              <span class="meter-label">鼠标活跃</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-mouse"></div></div>
              <span class="meter-value" id="val-mouse">0</span>
            </div>
          </div>
        </div>
        
        <div class="rhythm-summary" id="rhythm-summary">
          <div class="summary-item"><div>总活跃</div><div class="summary-val" id="sum-active">0m</div></div>
          <div class="summary-item"><div>心流</div><div class="summary-val" id="sum-flow">0m</div></div>
          <div class="summary-item"><div>总按键</div><div class="summary-val" id="sum-keys">0</div></div>
          <div class="summary-item"><div>最长连续</div><div class="summary-val" id="sum-streak">0m</div></div>
        </div>
        
        <div class="rhythm-hourly-title">活跃度曲线</div>
        <div class="rhythm-hourly" id="rhythm-hourly"></div>
        <div class="rhythm-hourly-labels">
          <span>0</span><span>4</span><span>8</span><span>12</span><span>16</span><span>20</span><span>24</span>
        </div>
        
        <div class="rhythm-insights" id="rhythm-insights"></div>
      </div>
    `;
    
    this._renderHourlyBars();
  }

  _update() {
    if (!this._analyzer || !this._engine) return;
    
    // The realtime section is updated via 'rhythm-tick' event, but we can do a fallback update here
    const currentState = this._analyzer.currentState || 'idle';
    const confidence = this._analyzer.confidence || 0;
    const duration = this._analyzer.stateDuration || 0;
    
    const currentSignals = this._analyzer.getCurrentSignals
      ? this._analyzer.getCurrentSignals()
      : {
          avgCPM: this._analyzer._signalCollector ? this._analyzer._signalCollector.typingSpeed : 0,
          deleteRate: this._analyzer._signalCollector ? this._analyzer._signalCollector.deleteRate || 0 : 0,
          mouseActive: this._analyzer._mouseCollector ? this._analyzer._mouseCollector.isActiveNow || false : false
        };

    // Ensure we trigger a fallback realtime update even between analyzer ticks
    this._updateRealtimeSection({
      state: currentState,
      confidence,
      duration,
      signals: currentSignals
    });

    this._updateSummarySection();
    this._updateHourlyBars();
    this._updateInsightsSection();
  }

  _updateRealtimeSection(data) {
    if (!data) return;
    
    const iconEl = this._container.querySelector('#rhythm-icon');
    const nameEl = this._container.querySelector('#rhythm-name');
    const detailEl = this._container.querySelector('#rhythm-detail');
    
    const stateMap = {
      'flow': { icon: '🔥', name: '心流状态' },
      'stuck': { icon: '😣', name: '卡壳状态' },
      'reading': { icon: '📖', name: '阅读思考' },
      'chatting': { icon: '💬', name: '沟通模式' },
      'typing': { icon: '⌨️', name: '打字中' },
      'away': { icon: '💤', name: '离开' },
      'idle': { icon: '⏳', name: '空闲' }
    };
    
    const stateInfo = stateMap[data.state] || stateMap['idle'];
    
    if (iconEl) iconEl.textContent = stateInfo.icon;
    if (nameEl) nameEl.textContent = stateInfo.name;
    if (detailEl) {
      const min = Math.floor(data.duration / 60000);
      detailEl.textContent = `已持续 ${min} 分钟`;
    }

    // Update meters
    const signals = data.signals || {};
    
    const cpm = signals.avgCPM || 0;
    const delRate = signals.deleteRate || 0;
    const mouseActive = signals.mouseActive ? 100 : 0;
    
    const cpmBar = this._container.querySelector('#meter-cpm');
    const cpmVal = this._container.querySelector('#val-cpm');
    if (cpmBar) cpmBar.style.width = `${Math.min(100, cpm / 3)}%`; // Assuming 300 CPM is max
    if (cpmVal) cpmVal.textContent = `${Math.round(cpm)} CPM`;
    
    const delBar = this._container.querySelector('#meter-delete');
    const delVal = this._container.querySelector('#val-delete');
    if (delBar) delBar.style.width = `${Math.min(100, delRate * 100 * 2)}%`;
    if (delVal) delVal.textContent = `${Math.round(delRate * 100)}%`;
    
    const mouseBar = this._container.querySelector('#meter-mouse');
    const mouseVal = this._container.querySelector('#val-mouse');
    if (mouseBar) mouseBar.style.width = `${mouseActive}%`;
    if (mouseVal) mouseVal.textContent = signals.mouseActive ? '活跃' : '静止';
  }

  _updateSummarySection() {
    if (!this._analyzer || !this._engine) return;
    
    const summary = this._analyzer.getDailySummary ? this._analyzer.getDailySummary() : { totalActiveMinutes: 0, totalFlowMinutes: 0 };
    const typingCount = this._engine.todayTypingCount || 0;
    const longestStreak = this._engine._dailyBaselines && this._engine._dailyBaselines.length > 0 ? 
                          this._engine._dailyBaselines[this._engine._dailyBaselines.length-1].longestStreak || 0 : 0;
    
    // 优先使用 compositeEngine 的打字分钟数（独立于状态机）
    const fullData = this._engine.getTodayFullData ? this._engine.getTodayFullData() : null;
    const totalTypingMinutes = fullData ? fullData.totalTypingMin : summary.totalActiveMinutes;
    const totalFlowMinutes = fullData ? fullData.totalFlowMin : summary.totalFlowMinutes;
    
    const elActive = this._container.querySelector('#sum-active');
    const elFlow = this._container.querySelector('#sum-flow');
    const elKeys = this._container.querySelector('#sum-keys');
    const elStreak = this._container.querySelector('#sum-streak');
    
    if (elActive) elActive.textContent = `${Math.round(totalTypingMinutes)}m`;
    if (elFlow) elFlow.textContent = `${Math.round(totalFlowMinutes)}m`;
    if (elKeys) elKeys.textContent = `${typingCount}`;
    if (elStreak) elStreak.textContent = `${longestStreak}m`;
  }

  _renderHourlyBars() {
    const container = this._container.querySelector('#rhythm-hourly');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.id = `hr-bar-${i}`;
      bar.style.height = '0%';
      bar.style.backgroundColor = '#e0e0e0';
      container.appendChild(bar);
    }
  }

  _updateHourlyBars() {
    if (!this._engine || !this._engine.todayActivity) return;
    
    const activity = this._engine.todayActivity;
    for (let i = 0; i < 24; i++) {
      const bar = this._container.querySelector(`#hr-bar-${i}`);
      if (!bar) continue;
      
      const hourData = activity[i];
      if (hourData) {
        const score = hourData.activityScore || 0;
        bar.style.height = `${Math.max(5, score)}%`;
        
        if (score > 80) bar.style.backgroundColor = '#ff6b6b';
        else if (score > 50) bar.style.backgroundColor = '#fca311';
        else if (score > 20) bar.style.backgroundColor = '#4ecdc4';
        else bar.style.backgroundColor = '#e0e0e0';
      }
    }
  }

  _updateInsightsSection() {
    const container = this._container.querySelector('#rhythm-insights');
    if (!container) return;
    
    const insights = this._generateInsights();
    
    if (insights.length === 0) {
      container.innerHTML = '<div class="insight-card">暂无足够数据生成洞察，请继续使用~</div>';
      return;
    }
    
    container.innerHTML = insights.map(insight => `
      <div class="insight-card">
        <span class="insight-icon">${insight.icon}</span>
        <span class="insight-text">${insight.text}</span>
      </div>
    `).join('');
  }

  _generateInsights() {
    const insights = [];
    if (!this._analyzer || !this._engine) return insights;
    
    const summary = this._analyzer.getDailySummary ? this._analyzer.getDailySummary() : { flowSessions: [] };
    const bestHours = this._engine.getBestWorkingHours ? this._engine.getBestWorkingHours() : [];
    
    // 心流洞察
    if (summary.flowSessions && summary.flowSessions.length > 0) {
      const longest = summary.flowSessions.sort((a, b) => b.durationMin - a.durationMin)[0];
      insights.push({
        icon: '🔥',
        text: `${longest.start}-${longest.end} 进入心流状态，连续高速输出 ${longest.durationMin} 分钟`
      });
    }
    
    // 最佳时段洞察
    if (bestHours.length > 0) {
      const best = bestHours[0];
      insights.push({
        icon: '💡',
        text: `你的最佳打字时段是 ${best.hour}:00-${best.hour + 1}:00，建议安排重要创作任务`
      });
    }
    
    // 基线对比洞察
    if (this._engine.getBaselineComparison) {
      const comparison = this._engine.getBaselineComparison();
      if (comparison && comparison.speedDelta > 0.15) {
        insights.push({
          icon: '📈',
          text: `今天打字速度比平时快 ${Math.round(comparison.speedDelta * 100)}%，状态不错！`
        });
      }
    }
    
    return insights;
  }
}
