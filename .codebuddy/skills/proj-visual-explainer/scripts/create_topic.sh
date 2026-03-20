#!/usr/bin/env bash
# 专题长页 HTML 骨架生成器（模板驱动）
# 用法: ./create_topic.sh [选项]
#
# 示例:
#   ./create_topic.sh --name MyProject_Design
#   ./create_topic.sh --name MyProject_Design --style warm-signal
#   ./create_topic.sh --name MyProject_Design --outline MyProject_Design.md
#   ./create_topic.sh --list-styles
#   ./create_topic.sh --help
#
# 脚本位于 .claude/skills/proj-visual-explainer/scripts/
# 模板目录: .claude/skills/proj-visual-explainer/scripts/templates/
# 输出到 {REPO_ROOT}/diagrams/
#
# 通过 --style 参数选择风格模板（默认 warm-signal）
# 新增风格只需在 templates/ 下添加 {style}.html + {style}.section.html
#
# 适用场景: 多章节深度阐述的专题长页（架构设计、技术复盘、设计方案等）
# 不适用于: 独立图表(generate-web-diagram)、幻灯片(generate-slides)等

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$SCRIPT_DIR/../../../.." && pwd)")
PYTHON="${PYTHON:-python3}"

exec "$PYTHON" "$SCRIPT_DIR/create_topic.py" --output-dir "$REPO_ROOT/diagrams" "$@"
