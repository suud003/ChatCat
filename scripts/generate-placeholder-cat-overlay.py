from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


CROP_Y = 320
CROP_H = 530
SPRITE_W = 800
SPRITE_H = 900
FRAME_OFFSETS = [
    (0, 0),
    (0, 6),
    (-2, 12),
    (0, 7),
]


def build_frame(base_crop: Image.Image, frame_idx: int) -> Image.Image:
    frame = Image.new("RGBA", base_crop.size, (0, 0, 0, 0))
    offset_x, offset_y = FRAME_OFFSETS[min(frame_idx, len(FRAME_OFFSETS) - 1)]
    frame.alpha_composite(base_crop, (offset_x, offset_y))
    return frame


def build_classic_cat_base(sprite_dir: Path) -> Image.Image:
    full = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    for name in ("cat", "mouth", "paw-left", "paw-right"):
        sprite = Image.open(sprite_dir / f"{name}.png").convert("RGBA")
        frame = sprite.crop((0, 0, SPRITE_W, SPRITE_H))
        full.alpha_composite(frame, (0, 0))
    return full.crop((0, CROP_Y, SPRITE_W, CROP_Y + CROP_H))


def main() -> None:
    sheet_dir = Path("src/pet/cat-overlays/default")
    sprite_path = Path("src/pet/sprites/cat.png")
    sprite_dir = Path("src/pet/sprites")
    meta = json.loads((sheet_dir / "sheet.json").read_text(encoding="utf-8"))
    frame_width = int(meta["frameWidth"])
    frame_height = int(meta["frameHeight"])
    columns = int(meta["columns"])
    rows = max(state["row"] for state in meta["states"].values()) + 1

    if frame_width != SPRITE_W or frame_height != CROP_H:
        raise ValueError(f"Expected overlay frame to use {SPRITE_W}x{CROP_H}, got {frame_width}x{frame_height}")

    if not sprite_path.exists():
        raise FileNotFoundError(sprite_path)

    base_crop = build_classic_cat_base(sprite_dir)
    img = Image.new("RGBA", (frame_width * columns, frame_height * rows), (0, 0, 0, 0))

    for state_name, state in meta["states"].items():
        row = int(state["row"])
        for frame_idx in range(int(state["frames"])):
            x0 = frame_idx * frame_width
            y0 = row * frame_height
            frame = build_frame(base_crop, frame_idx)
            img.alpha_composite(frame, (x0, y0))

    output = sheet_dir / "sheet.png"
    img.save(output)
    print(output.resolve())


if __name__ == "__main__":
    main()
