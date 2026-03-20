#!/usr/bin/env python3
"""
专题长页 HTML 骨架生成器（模板驱动）

为多章节深度阐述页面（架构设计、技术复盘、设计方案等）生成 HTML 骨架。
通过 --style 参数选择风格模板，默认使用 Warm Signal。

模板机制:
  模板文件存放在 scripts/templates/ 目录下：
  - {style}.html          — 页面主模板（含 CSS/JS/布局结构）
  - {style}.section.html  — section 片段模板（循环生成每个章节）
  模板中使用 {{占位符}} 标记动态区域，Python 代码负责替换。

适用场景: create-topic（专题长页）
不适用于: generate-web-diagram（独立图表）、generate-slides（幻灯片）等其他呈现方式

数据流: md(SSOT) → html(视觉呈现层)
定位工具: locate_sections.sh（实时从 HTML region 注释提取行号）

脚本位于: .claude/skills/proj-visual-explainer/scripts/
模板目录: .claude/skills/proj-visual-explainer/scripts/templates/
输出目录: 通过 --output-dir 指定，默认为 {REPO_ROOT}/diagrams/

用法:
  python create_topic.py --output-dir /path/to/diagrams --name ProjectName_Design
  python create_topic.py --name ProjectName_Design --style warm-signal
  python create_topic.py --name ProjectName_Design --outline ProjectName_Design.md
  python create_topic.py --name ProjectName_Design --title "项目标题" --subtitle "副标题"
"""

import argparse
import os
import re
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(SCRIPT_DIR, "templates")

# 默认风格
DEFAULT_STYLE = "warm-signal"


# ---------------------------------------------------------------------------
# 模板引擎
# ---------------------------------------------------------------------------

def load_template(style: str, kind: str = "page") -> str:
    """加载指定风格的模板文件。

    参数:
      style: 风格名称（如 "warm-signal"），对应 templates/{style}.html
      kind: "page" 加载页面主模板，"section" 加载 section 片段模板

    返回:
      模板文件内容字符串

    异常:
      SystemExit: 模板文件不存在时退出
    """
    if kind == "page":
        filename = f"{style}.html"
    else:
        filename = f"{style}.section.html"

    path = os.path.join(TEMPLATES_DIR, filename)
    if not os.path.exists(path):
        print(f"[ERROR] Template not found: {path}", file=sys.stderr)
        print(f"[HINT] Available templates:", file=sys.stderr)
        _list_available_styles(file=sys.stderr)
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def list_available_styles() -> list[str]:
    """列出 templates/ 目录下所有可用的风格。

    返回:
      风格名称列表（如 ["warm-signal", "blueprint"]）
    """
    styles = []
    if not os.path.isdir(TEMPLATES_DIR):
        return styles
    for name in sorted(os.listdir(TEMPLATES_DIR)):
        # 只匹配主模板（排除 .section.html）
        if name.endswith(".html") and not name.endswith(".section.html"):
            styles.append(name[:-5])  # 去掉 .html 后缀
    return styles


def _list_available_styles(file=None):
    """打印可用风格列表。"""
    styles = list_available_styles()
    if styles:
        for s in styles:
            has_section = os.path.exists(os.path.join(TEMPLATES_DIR, f"{s}.section.html"))
            marker = " (page + section)" if has_section else " (page only)"
            print(f"  - {s}{marker}", file=file)
    else:
        print(f"  (none found in {TEMPLATES_DIR})", file=file)


def render_template(template: str, variables: dict) -> str:
    """将模板中的 {{KEY}} 占位符替换为实际值。

    参数:
      template: 模板字符串
      variables: 占位符 → 值的映射字典

    返回:
      替换后的字符串
    """
    result = template
    for key, value in variables.items():
        result = result.replace("{{" + key + "}}", str(value))
    return result


# ---------------------------------------------------------------------------
# 大纲解析
# ---------------------------------------------------------------------------

def parse_outline(md_path: str) -> dict:
    """从大纲 Markdown 文件中提取结构信息。

    支持的大纲格式（## 章节标题行后面可选跟 metadata）:
      ## 1. 章节标题
      - section-label: SECTION ONE
      - section-id: s-one

    返回:
      {
        "title": "...",
        "subtitle": "...",
        "section_label": "...",   # hero 区域的 section-label
        "nav_logo": "...",
        "sections": [
          {"id": "s-xxx", "label": "NAV LABEL", "heading": "章节中文标题", "section_label": "SECTION LABEL"},
          ...
        ]
      }
    """
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    result = {
        "title": "",
        "subtitle": "",
        "section_label": "",
        "nav_logo": "",
        "sections": [],
    }

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # # 一级标题 -> 页面标题
        if line.startswith("# ") and not line.startswith("##"):
            result["title"] = line[2:].strip()
            # 尝试从后续行提取 subtitle / section-label / nav-logo
            i += 1
            while i < len(lines):
                sub = lines[i].strip()
                if sub.startswith("- subtitle:"):
                    result["subtitle"] = sub.split(":", 1)[1].strip()
                elif sub.startswith("- section-label:") or sub.startswith("- section_label:"):
                    result["section_label"] = sub.split(":", 1)[1].strip()
                elif sub.startswith("- nav-logo:") or sub.startswith("- nav_logo:"):
                    result["nav_logo"] = sub.split(":", 1)[1].strip()
                elif sub.startswith("- "):
                    pass  # 忽略其他 metadata
                elif sub == "":
                    i += 1
                    continue
                else:
                    break
                i += 1
            continue

        # ## 二级标题 -> section
        if line.startswith("## "):
            heading_raw = line[3:].strip()
            # 去掉编号前缀 "1. " / "01. "
            heading = re.sub(r"^\d+\.\s*", "", heading_raw)
            # 生成默认 id 和 label
            section_id = "s-" + re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")[:30]
            section_label = heading.upper()[:40]
            nav_label = heading

            # 读取后续 metadata 行
            i += 1
            while i < len(lines):
                sub = lines[i].strip()
                if sub.startswith("- section-id:") or sub.startswith("- section_id:"):
                    section_id = sub.split(":", 1)[1].strip()
                elif sub.startswith("- section-label:") or sub.startswith("- section_label:"):
                    section_label = sub.split(":", 1)[1].strip()
                elif sub.startswith("- nav-label:") or sub.startswith("- nav_label:"):
                    nav_label = sub.split(":", 1)[1].strip()
                elif sub.startswith("- "):
                    pass  # 忽略其他 metadata
                elif sub == "":
                    i += 1
                    continue
                else:
                    break
                i += 1

            result["sections"].append({
                "id": section_id,
                "label": nav_label,
                "heading": heading,
                "section_label": section_label,
            })
            continue

        i += 1

    return result


def build_default_outline(name: str, title: str, subtitle: str) -> dict:
    """没有大纲时，生成默认的 3-section 骨架结构。"""
    # 从 name 提取 logo，过滤空段（处理 _Test 这类前缀下划线的情况）
    parts = [p for p in name.split("_") if p]
    default_logo = parts[0][:12] if parts else name[:12]
    # 如果有 title，优先从 title 生成 logo
    if title:
        if any('\u4e00' <= c <= '\u9fff' for c in title):
            default_logo = title[:4]
        else:
            default_logo = title.split()[0][:12] if title.split() else title[:12]
    return {
        "title": title or name.replace("_", " ").strip(),
        "subtitle": subtitle or "Project Overview",
        "section_label": "OVERVIEW",
        "nav_logo": default_logo,
        "sections": [
            {"id": "s-overview", "label": "Overview", "heading": "项目概述", "section_label": "OVERVIEW"},
            {"id": "s-architecture", "label": "Architecture", "heading": "架构设计", "section_label": "ARCHITECTURE"},
            {"id": "s-summary", "label": "Summary", "heading": "总结与展望", "section_label": "SUMMARY"},
        ],
    }


# ---------------------------------------------------------------------------
# HTML 生成（模板驱动）
# ---------------------------------------------------------------------------

def generate_html(outline: dict, name: str, style: str = DEFAULT_STYLE) -> str:
    """基于大纲结构和风格模板生成完整的专题长页 HTML 骨架。

    参数:
      outline: 大纲数据（来自 parse_outline 或 build_default_outline）
      name: 文件名前缀
      style: 风格名称，对应 templates/{style}.html

    返回:
      完整的 HTML 字符串
    """
    today = datetime.now().strftime("%Y-%m-%d")

    title = outline["title"]
    subtitle = outline.get("subtitle", "")
    hero_label = outline.get("section_label", "OVERVIEW")
    parts = [p for p in name.split("_") if p]
    nav_logo = outline.get("nav_logo") or (parts[0][:12] if parts else name[:12])
    sections = outline.get("sections", [])

    # --- 加载模板 ---
    page_template = load_template(style, "page")

    # --- 生成 Nav links ---
    nav_links = ['<a href="#hero">Overview</a>']
    for sec in sections:
        nav_links.append(f'<a href="#{sec["id"]}">{sec["label"]}</a>')
    nav_html = "\n".join(nav_links)

    # --- 生成 Section blocks ---
    section_template_path = os.path.join(TEMPLATES_DIR, f"{style}.section.html")
    if os.path.exists(section_template_path):
        section_template = load_template(style, "section")
    else:
        # 兜底：如果没有 section 模板，用内联的简单结构
        section_template = (
            '<!-- #region {{SECTION_ID}} -->\n'
            '<section id="{{SECTION_ID}}"{{SECTION_ALT_CLASS}}>\n'
            '<div class="container">\n'
            '<p class="section-label">{{SECTION_LABEL}}</p>\n'
            '<h2>{{SECTION_HEADING}}</h2>\n'
            '<p>TODO: 在此填充内容</p>\n'
            '</div></section>\n'
            '<!-- #endregion {{SECTION_ID}} -->'
        )

    section_blocks = []
    for idx, sec in enumerate(sections):
        alt_class = ' class="section-alt"' if idx % 2 == 1 else ""
        block = render_template(section_template, {
            "SECTION_ID": sec["id"],
            "SECTION_ALT_CLASS": alt_class,
            "SECTION_LABEL": sec["section_label"],
            "SECTION_HEADING": sec["heading"],
        })
        section_blocks.append(block)

    sections_html = "\n\n".join(section_blocks)

    # --- Hero stats (placeholder) ---
    hero_stats = (
        '<div class="hero-stats">\n'
        '<div class="hero-stat"><div class="num" style="color:var(--accent)">--</div>'
        '<div class="label">Stat 1</div></div>\n'
        '<div class="hero-stat"><div class="num" style="color:var(--blue)">--</div>'
        '<div class="label">Stat 2</div></div>\n'
        '<div class="hero-stat"><div class="num" style="color:var(--teal)">--</div>'
        '<div class="label">Stat 3</div></div>\n'
        '<div class="hero-stat"><div class="num" style="color:var(--green)">--</div>'
        '<div class="label">Stat 4</div></div>\n'
        '</div>'
    )

    # --- 页脚文本 ---
    footer_text = f"{title} &mdash; Generated {today}"

    # --- 渲染主模板 ---
    html = render_template(page_template, {
        "TITLE": title,
        "SUBTITLE": subtitle,
        "NAV_LOGO": nav_logo,
        "HERO_LABEL": hero_label,
        "NAV_LINKS": nav_html,
        "HERO_STATS": hero_stats,
        "SECTIONS": sections_html,
        "FOOTER_TEXT": footer_text,
        "DATE": today,
    })

    return html


# ---------------------------------------------------------------------------
# Manifest 生成
# ---------------------------------------------------------------------------

def generate_manifest(html_content: str, name: str, outline: dict, style: str = DEFAULT_STYLE) -> dict:
    """基于生成的 HTML 内容构建 manifest.json。"""
    today = datetime.now().strftime("%Y-%m-%d")
    lines = html_content.split("\n")
    total_lines = len(lines)

    sections_manifest = []
    # 扫描 region 标记提取行号
    region_stack = {}
    for i, line in enumerate(lines, start=1):
        m = re.search(r"<!--\s*#region\s+(\S+)\s*-->", line)
        if m:
            region_stack[m.group(1)] = i
        m2 = re.search(r"<!--\s*#endregion\s+(\S+)\s*-->", line)
        if m2:
            rid = m2.group(1)
            if rid in region_stack:
                start = region_stack.pop(rid)
                # 查找对应 outline section
                for sec in outline.get("sections", []):
                    if sec["id"] == rid:
                        sections_manifest.append({
                            "id": rid,
                            "name": sec["heading"],
                            "line_start": start,
                            "line_end": i,
                            "type": "section",
                            "summary": f"TODO: 填充 {sec['heading']} 内容",
                        })
                        break
                else:
                    # 共享资源区域（css, nav, hero, footer, scripts）
                    if rid == "hero":
                        sections_manifest.append({
                            "id": "hero",
                            "name": outline.get("title", name),
                            "line_start": start,
                            "line_end": i,
                            "type": "hero",
                            "summary": "Hero 标题 + 统计数据占位",
                        })

    # 提取 shared_resources
    shared = {}
    for rid in ("css", "nav", "footer", "scripts"):
        for i, line in enumerate(lines, start=1):
            if f"#region {rid}" in line:
                shared[rid] = {"line_start": i}
            if f"#endregion {rid}" in line and rid in shared:
                shared[rid]["line_end"] = i

    manifest = {
        "file": f"{name}.html",
        "title": outline.get("title", name),
        "generated": today,
        "total_lines": total_lines,
        "theme": style,
        "sections": sections_manifest,
        "shared_resources": shared,
    }
    return manifest


# ---------------------------------------------------------------------------
# 大纲骨架生成
# ---------------------------------------------------------------------------

def generate_outline_md(outline: dict, name: str) -> str:
    """生成骨架大纲 Markdown 文件内容。"""
    today = datetime.now().strftime("%Y-%m-%d")
    lines = [
        f"# {outline['title']}",
        "",
    ]
    if outline.get("subtitle"):
        lines.append(f"- subtitle: {outline['subtitle']}")
    if outline.get("section_label"):
        lines.append(f"- section-label: {outline['section_label']}")
    if outline.get("nav_logo"):
        lines.append(f"- nav-logo: {outline['nav_logo']}")
    lines.append(f"- date: {today}")
    lines.append("")

    for idx, sec in enumerate(outline.get("sections", []), start=1):
        lines.append(f"## {idx}. {sec['heading']}")
        lines.append(f"- section-id: {sec['id']}")
        lines.append(f"- section-label: {sec['section_label']}")
        lines.append(f"- nav-label: {sec['label']}")
        lines.append("")
        lines.append("<!-- TODO: 在此补充章节要点 -->")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 收集可用风格用于帮助信息
    styles = list_available_styles()
    styles_help = ", ".join(styles) if styles else "(none)"

    parser = argparse.ArgumentParser(
        description="专题长页 HTML 骨架生成器（模板驱动）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
模板风格:
  可用风格: {styles_help}
  模板目录: {TEMPLATES_DIR}
  每个风格由两个文件组成:
    {{style}}.html          — 页面主模板（CSS/JS/布局结构）
    {{style}}.section.html  — section 片段模板（循环生成章节）

示例:
  # 最简用法 — 使用默认风格（{DEFAULT_STYLE}）生成 3-section 骨架
  python create_topic.py --name MyProject_Design

  # 指定风格
  python create_topic.py --name MyProject_Design --style warm-signal

  # 列出所有可用风格
  python create_topic.py --list-styles

  # 指定输出目录
  python create_topic.py --output-dir /path/to/diagrams --name MyProject_Design

  # 从已有大纲生成
  python create_topic.py --name MyProject_Design --outline MyProject_Design.md

  # 自定义标题和副标题
  python create_topic.py --name MyProject_Design --title "我的项目" --subtitle "架构设计方案"

  # 自定义 section（逗号分隔，格式: heading[:id[:label]]）
  python create_topic.py --name MyProject_Design --sections "项目概述:s-overview:OVERVIEW,架构设计:s-arch:ARCHITECTURE"

生成的文件:
  {{output_dir}}/{{name}}.html    — 专题长页 HTML 骨架（含 region 标记）
  {{output_dir}}/{{name}}.md      — 大纲文件（仅在不存在时生成，SSOT 数据源）
""",
    )
    parser.add_argument("--name", help="文件名前缀（不含扩展名），如 MyProject_Design")
    parser.add_argument("--style", default=DEFAULT_STYLE,
                        help=f"风格模板名称（默认: {DEFAULT_STYLE}）。可用: {styles_help}")
    parser.add_argument("--list-styles", action="store_true", help="列出所有可用风格模板并退出")
    parser.add_argument("--output-dir", dest="output_dir", help="输出目录（默认为 diagrams/）")
    parser.add_argument("--outline", help="已有的大纲 .md 文件路径（相对于输出目录或绝对路径）")
    parser.add_argument("--title", help="页面标题（覆盖大纲中的标题）")
    parser.add_argument("--subtitle", default="", help="页面副标题")
    parser.add_argument("--nav-logo", dest="nav_logo", help="导航栏 Logo 文字")
    parser.add_argument("--section-label", dest="section_label", help="Hero 区域的 section-label 文字")
    parser.add_argument(
        "--sections",
        help="自定义 sections，逗号分隔，格式: heading[:section-id[:section-label[:nav-label]]]",
    )
    parser.add_argument("--force", action="store_true", help="强制覆盖已存在的 HTML 文件")

    args = parser.parse_args()

    # --- 列出可用风格 ---
    if args.list_styles:
        print("Available style templates:")
        _list_available_styles()
        print(f"\nTemplate directory: {TEMPLATES_DIR}")
        print(f"\nTo add a new style, create:")
        print(f"  {TEMPLATES_DIR}/{{style}}.html          — page template")
        print(f"  {TEMPLATES_DIR}/{{style}}.section.html  — section fragment template")
        sys.exit(0)

    # --- 校验必要参数 ---
    if not args.name:
        parser.error("--name is required (unless using --list-styles)")

    # --- 验证风格模板存在 ---
    page_template_path = os.path.join(TEMPLATES_DIR, f"{args.style}.html")
    if not os.path.exists(page_template_path):
        print(f"[ERROR] Style template not found: {args.style}", file=sys.stderr)
        print(f"[HINT] Available styles:", file=sys.stderr)
        _list_available_styles(file=sys.stderr)
        sys.exit(1)

    # 确定输出目录
    if args.output_dir:
        output_dir = args.output_dir
    else:
        # 兜底：通过 git 推导项目根目录，输出到 diagrams/
        import subprocess
        try:
            repo_root = subprocess.check_output(
                ["git", "-C", SCRIPT_DIR, "rev-parse", "--show-toplevel"],
                text=True,
            ).strip()
        except Exception:
            repo_root = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
        output_dir = os.path.join(repo_root, "diagrams")

    os.makedirs(output_dir, exist_ok=True)
    html_path = os.path.join(output_dir, f"{args.name}.html")
    outline_path = os.path.join(output_dir, f"{args.name}.md")

    # 安全检查：HTML 文件是否已存在
    if os.path.exists(html_path) and not args.force:
        print(f"[ERROR] {html_path} already exists. Use --force to overwrite.", file=sys.stderr)
        sys.exit(1)

    # 解析或构建大纲
    outline_source = None

    # 1. 如果指定了 --outline，使用它
    if args.outline:
        p = args.outline if os.path.isabs(args.outline) else os.path.join(output_dir, args.outline)
        if not os.path.exists(p):
            print(f"[ERROR] Outline file not found: {p}", file=sys.stderr)
            sys.exit(1)
        outline = parse_outline(p)
        outline_source = "file"
        print(f"[INFO] Parsed outline from: {p}")
    # 2. 如果同名 .md 已存在，自动识别
    elif os.path.exists(outline_path):
        outline = parse_outline(outline_path)
        outline_source = "auto"
        print(f"[INFO] Found existing outline: {outline_path}")
    # 3. 如果传了 --sections，从参数构建
    elif args.sections:
        secs = []
        for part in args.sections.split(","):
            fields = part.strip().split(":")
            heading = fields[0]
            sid = fields[1] if len(fields) > 1 else "s-" + re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")[:30]
            slabel = fields[2] if len(fields) > 2 else heading.upper()[:40]
            nlabel = fields[3] if len(fields) > 3 else heading
            secs.append({"id": sid, "label": nlabel, "heading": heading, "section_label": slabel})
        outline = {
            "title": args.title or args.name.replace("_", " "),
            "subtitle": args.subtitle,
            "section_label": args.section_label or "OVERVIEW",
            "nav_logo": args.nav_logo or (args.name.split("_")[0] if "_" in args.name else args.name[:12]),
            "sections": secs,
        }
        outline_source = "args"
    # 4. 兜底：默认 3-section 骨架
    else:
        outline = build_default_outline(args.name, args.title or "", args.subtitle)
        outline_source = "default"

    # 命令行参数覆盖
    if args.title:
        outline["title"] = args.title
    if args.subtitle:
        outline["subtitle"] = args.subtitle
    if args.nav_logo:
        outline["nav_logo"] = args.nav_logo
    if args.section_label:
        outline["section_label"] = args.section_label

    # 如果没有 nav_logo 或为空，按优先级生成默认值
    if not outline.get("nav_logo"):
        # 优先从 title 取前几个字作为 logo
        title_text = outline.get("title", "")
        if title_text:
            # 中文标题取前4个字，英文取前12个字符
            if any('\u4e00' <= c <= '\u9fff' for c in title_text):
                outline["nav_logo"] = title_text[:4]
            else:
                outline["nav_logo"] = title_text.split()[0][:12] if title_text.split() else title_text[:12]
        else:
            # 从 name 提取，过滤掉空段
            parts = [p for p in args.name.split("_") if p]
            outline["nav_logo"] = parts[0][:12] if parts else args.name[:12]

    # --- 生成 HTML ---
    html_content = generate_html(outline, args.name, style=args.style)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    total_lines = len(html_content.split("\n"))
    print(f"[OK] HTML:     {html_path}")

    # --- 生成大纲（仅在不存在时） ---
    if not os.path.exists(outline_path):
        outline_md = generate_outline_md(outline, args.name)
        with open(outline_path, "w", encoding="utf-8") as f:
            f.write(outline_md)
        print(f"[OK] Outline:  {outline_path} (skeleton created)")
    else:
        print(f"[SKIP] Outline: {outline_path} (already exists)")

    # --- 打印摘要 ---
    print()
    print("=" * 60)
    print(f"  Topic: {outline['title']}")
    print(f"  Style: {args.style}")
    print(f"  Sections: {len(outline.get('sections', []))}")
    print(f"  Outline source: {outline_source}")
    print(f"  HTML lines: {total_lines}")
    print("=" * 60)
    print()
    print("Next steps:")
    print(f"  1. Edit {outline_path} — complete the SSOT content")
    print(f"  2. Refine {html_path} — distill md content into visual sections")
    print(f"  3. Locate sections: bash locate_sections.sh {args.name}")
    print(f"  4. Preview: cd diagrams && bash serve.sh")


if __name__ == "__main__":
    main()
