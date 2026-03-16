/**
 * User Profiler — Manages user profile data collection
 *
 * Handles Day 1-3 onboarding flow where the cat gradually
 * learns about the user through casual conversation.
 * Stores data in `userProfile` store key.
 */

export class UserProfiler {
  constructor() {
    this._profile = null;
    this._proactiveEngine = null;
    this._chatUI = null;
  }

  async init(proactiveEngine, chatUI) {
    this._proactiveEngine = proactiveEngine;
    this._chatUI = chatUI;

    // Load profile
    this._profile = await window.electronAPI.getStore('userProfile') || {
      occupation: '',
      workSchedule: { startHour: 9, endHour: 18 },
      interactionPreference: 'medium',
      importantDates: [],
      workType: '',
      onboardingDay: 0,
      onboardingCompleted: false
    };

    // Check onboarding status
    if (!this._profile.onboardingCompleted) {
      await this._checkOnboarding();
    }
  }

  async _checkOnboarding() {
    const day = this._profile.onboardingDay;

    // Day 0 → Day 1: first launch
    if (day === 0) {
      // Wait a bit before starting onboarding
      setTimeout(() => {
        this._startDay1();
      }, 5000);
    } else if (day === 1) {
      // Check if enough time has passed for Day 2
      const lastOnboard = await window.electronAPI.getStore('lastOnboardingDate');
      const today = new Date().toISOString().split('T')[0];
      if (lastOnboard !== today) {
        setTimeout(() => this._startDay2(), 10000);
      }
    } else if (day === 2) {
      const lastOnboard = await window.electronAPI.getStore('lastOnboardingDate');
      const today = new Date().toISOString().split('T')[0];
      if (lastOnboard !== today) {
        setTimeout(() => this._startDay3(), 10000);
      }
    }
  }

  _startDay1() {
    // Push via ProactiveEngine as a guided conversation
    if (this._proactiveEngine) {
      this._proactiveEngine._processSignal('onboarding', {
        day: 1,
        questions: [
          '你好呀！初次见面~ 你平时是做什么工作的呀？(程序员/设计师/学生/...)',
        ]
      });
    }
  }

  _startDay2() {
    if (this._proactiveEngine) {
      this._proactiveEngine._processSignal('onboarding', {
        day: 2,
        questions: [
          '对了，你一般几点上班几点下班呀？猫咪好安排提醒时间~',
          '你喜欢猫咪多主动一点还是安静一点？'
        ]
      });
    }
  }

  _startDay3() {
    if (this._proactiveEngine) {
      this._proactiveEngine._processSignal('onboarding', {
        day: 3,
        questions: [
          '你平时工作主要是写代码还是写文档比较多呀？',
        ]
      });
    }
  }

  /**
   * Process user response to onboarding question.
   * Extracts profile info via keyword matching.
   */
  async processOnboardingResponse(day, response) {
    const text = response.toLowerCase();

    if (day === 1) {
      // Extract occupation
      const occupations = {
        '程序员': ['程序', '开发', 'developer', 'engineer', '码农', '写代码'],
        '设计师': ['设计', 'design', 'UI', 'UX'],
        '学生': ['学生', 'student', '学习'],
        '产品经理': ['产品', 'PM', 'product'],
        '运营': ['运营', 'operation'],
        '其他': []
      };

      for (const [occ, keywords] of Object.entries(occupations)) {
        if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
          this._profile.occupation = occ;
          break;
        }
      }

      this._profile.onboardingDay = 1;
      await window.electronAPI.setStore('lastOnboardingDate', new Date().toISOString().split('T')[0]);
    } else if (day === 2) {
      // Extract work schedule
      const hourMatch = text.match(/(\d{1,2})\s*[点:：时]\s*[到至-]\s*(\d{1,2})\s*[点:：时]?/);
      if (hourMatch) {
        this._profile.workSchedule.startHour = parseInt(hourMatch[1]);
        this._profile.workSchedule.endHour = parseInt(hourMatch[2]);
      }

      // Extract interaction preference
      if (text.includes('多') || text.includes('主动') || text.includes('活跃')) {
        this._profile.interactionPreference = 'high';
      } else if (text.includes('少') || text.includes('安静') || text.includes('别打扰')) {
        this._profile.interactionPreference = 'low';
      }

      this._profile.onboardingDay = 2;
      await window.electronAPI.setStore('lastOnboardingDate', new Date().toISOString().split('T')[0]);
    } else if (day === 3) {
      // Extract work type
      if (text.includes('代码') || text.includes('编程') || text.includes('code')) {
        this._profile.workType = 'coding';
      } else if (text.includes('文档') || text.includes('写作') || text.includes('writing')) {
        this._profile.workType = 'writing';
      } else if (text.includes('设计') || text.includes('design')) {
        this._profile.workType = 'design';
      } else {
        this._profile.workType = 'mixed';
      }

      this._profile.onboardingDay = 3;
      this._profile.onboardingCompleted = true;
      await window.electronAPI.setStore('lastOnboardingDate', new Date().toISOString().split('T')[0]);

      // Apply profile to proactive config
      await this._applyProfile();
    }

    await window.electronAPI.setStore('userProfile', this._profile);
  }

  async _applyProfile() {
    // Adjust proactive config based on profile
    const config = await window.electronAPI.getStore('proactiveConfig') || {};

    // Adjust max daily interactions based on preference
    const prefMap = { low: 4, medium: 8, high: 12 };
    config.maxDailyInteractions = prefMap[this._profile.interactionPreference] || 8;

    // Adjust quiet hours based on work schedule
    config.quietHours = {
      start: Math.min(23, this._profile.workSchedule.endHour + 5),
      end: Math.max(6, this._profile.workSchedule.startHour - 1)
    };

    await window.electronAPI.setStore('proactiveConfig', config);

    // Update engine
    if (this._proactiveEngine) {
      await this._proactiveEngine.updateConfig();
    }
  }

  get profile() { return this._profile; }
}
