from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


def draw_cat(draw: ImageDraw.ImageDraw, x0: int, y0: int, size: int, frame_idx: int) -> None:
    cx = x0 + size // 2
    cy = y0 + size // 2 + 12
    nod_offsets = [0, 10, 20, 8]
    eye_levels = [0, 1, 2, 1]
    nod = nod_offsets[min(frame_idx, len(nod_offsets) - 1)]
    eye = eye_levels[min(frame_idx, len(eye_levels) - 1)]

    head_y = cy - 30 + nod
    body_y = cy + 34 + nod // 2

    draw.ellipse((cx - 62, body_y - 48, cx + 62, body_y + 40), fill=(244, 200, 154, 255), outline=(34, 34, 34, 255), width=4)
    draw.ellipse((cx - 78, head_y - 64, cx + 78, head_y + 48), fill=(244, 200, 154, 255), outline=(34, 34, 34, 255), width=4)
    draw.polygon([(cx - 54, head_y - 24), (cx - 26, head_y - 88), (cx - 4, head_y - 28)], fill=(244, 200, 154, 255), outline=(34, 34, 34, 255))
    draw.polygon([(cx + 54, head_y - 24), (cx + 26, head_y - 88), (cx + 4, head_y - 28)], fill=(244, 200, 154, 255), outline=(34, 34, 34, 255))

    if eye == 0:
        draw.ellipse((cx - 26, head_y - 10, cx - 14, head_y + 2), fill=(34, 34, 34, 255))
        draw.ellipse((cx + 14, head_y - 10, cx + 26, head_y + 2), fill=(34, 34, 34, 255))
    elif eye == 1:
        draw.line((cx - 28, head_y - 4, cx - 14, head_y - 2), fill=(34, 34, 34, 255), width=4)
        draw.line((cx + 14, head_y - 2, cx + 28, head_y - 4), fill=(34, 34, 34, 255), width=4)
    else:
        draw.line((cx - 28, head_y - 1, cx - 12, head_y - 1), fill=(34, 34, 34, 255), width=4)
        draw.line((cx + 12, head_y - 1, cx + 28, head_y - 1), fill=(34, 34, 34, 255), width=4)

    draw.polygon([(cx, head_y + 10), (cx - 5, head_y + 16), (cx + 5, head_y + 16)], fill=(232, 153, 141, 255))
    draw.arc((cx - 12, head_y + 12, cx + 12, head_y + 28), start=0, end=180, fill=(34, 34, 34, 255), width=3)


def main() -> None:
    sheet_dir = Path("src/pet/cat-overlays/default")
    meta = json.loads((sheet_dir / "sheet.json").read_text(encoding="utf-8"))
    frame_width = int(meta["frameWidth"])
    frame_height = int(meta["frameHeight"])
    columns = int(meta["columns"])
    rows = max(state["row"] for state in meta["states"].values()) + 1

    img = Image.new("RGBA", (frame_width * columns, frame_height * rows), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for state_name, state in meta["states"].items():
      row = int(state["row"])
      for frame_idx in range(int(state["frames"])):
          x0 = frame_idx * frame_width
          y0 = row * frame_height
          draw_cat(draw, x0, y0, frame_width, frame_idx)
          draw.text((x0 + 10, y0 + 10), f"{state_name} {frame_idx}", fill=(80, 80, 80, 180))

    output = sheet_dir / "sheet.png"
    img.save(output)
    print(output.resolve())


if __name__ == "__main__":
    main()
