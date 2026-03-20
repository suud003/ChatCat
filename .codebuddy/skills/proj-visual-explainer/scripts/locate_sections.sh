#!/usr/bin/env bash
# locate_sections.sh — 从 HTML 的 region 注释实时提取 section 行号
#
# 脚本位于: .claude/skills/proj-visual-explainer/scripts/
# 搜索路径: 接受相对/绝对路径，自动补 .html 扩展名
#
# 用法:
#   bash locate_sections.sh <path/to/file>              # 列出所有 sections
#   bash locate_sections.sh <path/to/file> <section-id>  # 定位指定 section
#
# 示例:
#   bash locate_sections.sh diagrams/UGCAgentService_Review
#   bash locate_sections.sh diagrams/UGCAgentService_Review s-modules
#   bash locate_sections.sh /abs/path/to/diagrams/UGCAgentService_Review

set -euo pipefail

# --- 参数校验 ---
if [ $# -lt 1 ]; then
    echo "Usage: bash $0 <path/to/name> [section-id]" >&2
    echo "" >&2
    echo "  <path/to/name>  HTML 文件路径（不含 .html 扩展名），支持相对/绝对路径" >&2
    echo "  [section-id]    可选，指定 section id 只输出该 section" >&2
    echo "" >&2
    echo "Examples:" >&2
    echo "  bash $0 diagrams/UGCAgentService_Review" >&2
    echo "  bash $0 diagrams/UGCAgentService_Review s-modules" >&2
    exit 1
fi

INPUT_PATH="$1"
TARGET_SECTION="${2:-}"

# 自动补 .html 扩展名
if [[ "$INPUT_PATH" == *.html ]]; then
    HTML_FILE="$INPUT_PATH"
else
    HTML_FILE="${INPUT_PATH}.html"
fi

# 提取显示用的文件名
NAME=$(basename "$HTML_FILE" .html)

if [ ! -f "$HTML_FILE" ]; then
    echo "[ERROR] File not found: $HTML_FILE" >&2
    exit 1
fi

TOTAL_LINES=$(wc -l < "$HTML_FILE")

# --- 提取所有 region 标记 ---
# 格式: 行号:#region|#endregion section-id
declare -A REGION_STARTS

# 临时文件存储 region 信息
REGIONS_RAW=$(grep -n "<!-- #region\|<!-- #endregion" "$HTML_FILE" || true)

if [ -z "$REGIONS_RAW" ]; then
    echo "[WARN] No region markers found in $HTML_FILE" >&2
    exit 0
fi

# 收集所有 section 信息
declare -a SECTION_IDS=()
declare -A SECTION_STARTS=()
declare -A SECTION_ENDS=()

while IFS= read -r line; do
    LINE_NUM=$(echo "$line" | cut -d: -f1)
    CONTENT=$(echo "$line" | cut -d: -f2-)

    # 匹配 #region
    if echo "$CONTENT" | grep -q "<!-- #region"; then
        SECTION_ID=$(echo "$CONTENT" | sed -n 's/.*<!-- *#region *\([^ ]*\) *-->.*/\1/p')
        if [ -n "$SECTION_ID" ]; then
            SECTION_STARTS["$SECTION_ID"]="$LINE_NUM"
        fi
    fi

    # 匹配 #endregion
    if echo "$CONTENT" | grep -q "<!-- #endregion"; then
        SECTION_ID=$(echo "$CONTENT" | sed -n 's/.*<!-- *#endregion *\([^ ]*\) *-->.*/\1/p')
        if [ -n "$SECTION_ID" ]; then
            SECTION_ENDS["$SECTION_ID"]="$LINE_NUM"
            SECTION_IDS+=("$SECTION_ID")
        fi
    fi
done <<< "$REGIONS_RAW"

# --- 输出 ---
if [ -n "$TARGET_SECTION" ]; then
    # 指定 section 模式
    START="${SECTION_STARTS[$TARGET_SECTION]:-}"
    END="${SECTION_ENDS[$TARGET_SECTION]:-}"
    if [ -z "$START" ] || [ -z "$END" ]; then
        echo "[ERROR] Section '$TARGET_SECTION' not found." >&2
        echo "" >&2
        echo "Available sections:" >&2
        for sid in "${SECTION_IDS[@]}"; do
            echo "  - $sid" >&2
        done
        exit 1
    fi
    LINES=$((END - START + 1))
    echo "${NAME}.html | section: ${TARGET_SECTION} | lines: ${START}-${END} (${LINES} lines)"
else
    # 全量输出模式
    echo "=== ${NAME}.html (${TOTAL_LINES} lines) ==="
    echo ""
    printf "%-25s  %s\n" "SECTION" "LINES"
    printf "%-25s  %s\n" "-------------------------" "-------------------"

    for sid in "${SECTION_IDS[@]}"; do
        START="${SECTION_STARTS[$sid]:-?}"
        END="${SECTION_ENDS[$sid]:-?}"
        if [ "$START" != "?" ] && [ "$END" != "?" ]; then
            LINES=$((END - START + 1))
            printf "%-25s  %s-%s (%d lines)\n" "$sid" "$START" "$END" "$LINES"
        fi
    done

    echo ""
    echo "Total: ${#SECTION_IDS[@]} sections, ${TOTAL_LINES} lines"
fi
