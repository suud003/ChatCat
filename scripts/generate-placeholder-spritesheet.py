from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


PALETTE = [
    (255, 232, 214, 255),
    (255, 214, 165, 255),
    (255, 199, 206, 255),
    (196, 229, 255, 255),
    (213, 245, 227, 255),
    (234, 220, 255, 255),
    (255, 241, 179, 255),
    (220, 220, 220, 255),
]


def draw_placeholder_cell(draw: ImageDraw.ImageDraw, x0: int, y0: int, fw: int, fh: int, state_name: str, frame_idx: int, color: tuple[int, int, int, int]) -> None:
    x1 = x0 + fw - 1
    y1 = y0 + fh - 1
    cx = x0 + fw // 2
    cy = y0 + fh // 2 + 10

    draw.rounded_rectangle(
        (x0 + 10, y0 + 10, x1 - 10, y1 - 10),
        radius=20,
        fill=color,
        outline=(34, 34, 34, 255),
        width=4,
    )

    # Head
    draw.ellipse(
        (cx - 58, cy - 88, cx + 58, cy + 28),
        fill=(244, 200, 154, 255),
        outline=(34, 34, 34, 255),
        width=4,
    )
    # Ears
    draw.polygon(
        [(cx - 40, cy - 68), (cx - 18, cy - 118), (cx - 2, cy - 66)],
        fill=(244, 200, 154, 255),
        outline=(34, 34, 34, 255),
    )
    draw.polygon(
        [(cx + 40, cy - 68), (cx + 18, cy - 118), (cx + 2, cy - 66)],
        fill=(244, 200, 154, 255),
        outline=(34, 34, 34, 255),
    )

    # Eyes / expressions
    if state_name == "sleep":
        draw.line((cx - 22, cy - 24, cx - 6, cy - 24), fill=(34, 34, 34, 255), width=4)
        draw.line((cx + 6, cy - 24, cx + 22, cy - 24), fill=(34, 34, 34, 255), width=4)
    elif "blink" in state_name:
        draw.line((cx - 20, cy - 25, cx - 6, cy - 23), fill=(34, 34, 34, 255), width=4)
        draw.line((cx + 6, cy - 23, cx + 20, cy - 25), fill=(34, 34, 34, 255), width=4)
    else:
        draw.ellipse((cx - 18, cy - 30, cx - 8, cy - 20), fill=(34, 34, 34, 255))
        draw.ellipse((cx + 8, cy - 30, cx + 18, cy - 20), fill=(34, 34, 34, 255))

    # Mouth
    if state_name == "happy":
        draw.arc((cx - 16, cy - 5, cx + 16, cy + 18), start=0, end=180, fill=(232, 153, 141, 255), width=4)
    else:
        draw.arc((cx - 10, cy - 4, cx + 10, cy + 8), start=0, end=180, fill=(232, 153, 141, 255), width=3)

    # Keyboard / table
    draw.rounded_rectangle(
        (cx - 96, cy + 48, cx + 96, cy + 90),
        radius=12,
        fill=(250, 249, 247, 255),
        outline=(34, 34, 34, 255),
        width=4,
    )

    draw.text((x0 + 22, y0 + 20), state_name, fill=(34, 34, 34, 255))
    draw.text((x0 + 22, y0 + 46), f"frame {frame_idx}", fill=(90, 90, 90, 255))


def draw_empty_cell(draw: ImageDraw.ImageDraw, x0: int, y0: int, fw: int, fh: int) -> None:
    x1 = x0 + fw - 1
    y1 = y0 + fh - 1
    draw.rounded_rectangle(
        (x0 + 10, y0 + 10, x1 - 10, y1 - 10),
        radius=20,
        fill=(0, 0, 0, 0),
        outline=(180, 180, 180, 120),
        width=2,
    )


def build_placeholder(sheet_dir: Path) -> Path:
    meta = json.loads((sheet_dir / "sheet.json").read_text(encoding="utf-8"))
    frame_width = int(meta["frameWidth"])
    frame_height = int(meta["frameHeight"])
    columns = int(meta["columns"])
    states = meta["states"]
    rows = max(state["row"] for state in states.values()) + 1

    img = Image.new("RGBA", (columns * frame_width, rows * frame_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for state_name, state in sorted(states.items(), key=lambda item: item[1]["row"]):
        row = int(state["row"])
        frames = int(state["frames"])
        color = PALETTE[row % len(PALETTE)]

        for frame_idx in range(columns):
            x0 = frame_idx * frame_width
            y0 = row * frame_height
            if frame_idx < frames:
                draw_placeholder_cell(draw, x0, y0, frame_width, frame_height, state_name, frame_idx, color)
            else:
                draw_empty_cell(draw, x0, y0, frame_width, frame_height)

    output_path = sheet_dir / "sheet.png"
    img.save(output_path)
    return output_path


if __name__ == "__main__":
    default_dir = Path("src/pet/spritesheets/default")
    output = build_placeholder(default_dir)
    print(output.resolve())
