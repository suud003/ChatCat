---
name: daily-report
description: 根据今日已转换的打字文本生成结构化工作日报。触发：/report、/日报、"生成日报"、"写日报"、"今天日报"。每日 18:00 自动触发。此 Skill 依赖 text-converter 的输出（convertedText），从中提炼工作内容、生成分时段的 Markdown 日报。
commands: ["/report", "/日报"]
keywords: ["生成日报", "写日报", "今天日报", "daily report", "日报"]
schedule:
  cronHour: 18
context: [convertedText, rawTyping, todos, pomodoroStats]
requiresAI: true
temperature: 0.5
---

# 日报生成

根据用户今天的打字文本记录，生成一份结构化的工作日报。

## 数据来源

日报使用两个数据源，按优先级：

1. **convertedText**（优先）：由 text-converter Skill 预处理后的可读中文文本，按时间段组织
2. **rawTyping**（兜底）：如果 convertedText 为空或不足，使用原始键盘记录。原始记录格式为 `[HH:MM:SS] [拼音:xxx][选字:N]...`，需要将拼音还原为中文理解

## 分析流程

1. **通读全天记录**：从第一条到最后一条，不要遗漏任何时间段
2. **按时间分段**：上午（开始~12:00）、下午（12:00~18:00）、晚上（18:00~结束）
3. **提取工作内容**：从文字内容推断用户在做什么
4. **分类归纳**：将工作内容归类为编码、文档撰写、沟通讨论、产品设计、测试调试等
5. **提炼成果**：总结每个时段的关键产出

## 输出格式

ALWAYS use this exact template structure:

```markdown
# 工作日报 YYYY-MM-DD

## 今日概要
[一句话总结今天的主要工作]

## 上午
- [工作事项1]
- [工作事项2]

## 下午
- [工作事项1]
- [工作事项2]

## 晚上
- [工作事项1]（如果有晚间工作记录）

## 待办 & 番茄钟
- 待办完成情况：[X/Y 完成]
- 番茄钟：[N 个]

## 小结
[2-3 句话总结今日工作重点和产出]
```

## 注意事项

- 覆盖全天所有时间段的记录，不要只分析开头部分
- 忽略明显的测试输入（重复字符等）
- 忽略密码、token 等敏感内容
- 使用中文
- 如果某时段数据不足，注明"该时段记录较少"而非跳过
