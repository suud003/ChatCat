---
id: weekly-report
name: 周报生成
trigger:
  keywords: [周报, weekly, 本周总结]
  commands: [/weekly]
  schedule: "sunday-18:00"
---

## TASK
基于最近7天的节奏数据生成周报。

## DATA
- 读取 rhythmData_{date} (最近7天)
- 读取 rhythmBaselines (7天基线)

## PROMPT
你是 ChatCat 🐱。根据以下7天的工作节奏数据，生成周报：
1. 本周总览（总活跃时长、心流时长、趋势）
2. 每日亮点（选3个最突出的日子）
3. 节奏趋势（是在变好还是变差）
4. 下周建议（基于数据）
