# Custom Sprite Sheet Format Guide

This document describes how to create custom animated characters for ChatCat using sprite sheets.

## Sprite Sheet Structure

A sprite sheet character consists of two files in a folder under `src/pet/spritesheets/<id>/`:

```
src/pet/spritesheets/my-cat/
  sheet.png    ← the sprite sheet image
  sheet.json   ← metadata describing the layout
```

## sheet.json Format

```json
{
  "frameWidth": 300,
  "frameHeight": 300,
  "columns": 8,
  "tintable": true,
  "states": {
    "idle":         { "row": 0, "frames": 6, "frameDuration": 200, "loop": true },
    "idle-blink":   { "row": 1, "frames": 3, "frameDuration": 80,  "loop": false },
    "typing-left":  { "row": 2, "frames": 3, "frameDuration": 60,  "loop": false },
    "typing-right": { "row": 3, "frames": 3, "frameDuration": 60,  "loop": false },
    "click-react":  { "row": 4, "frames": 4, "frameDuration": 120, "loop": false },
    "happy":        { "row": 5, "frames": 4, "frameDuration": 180, "loop": true },
    "sleep":        { "row": 6, "frames": 4, "frameDuration": 500, "loop": true },
    "wake-up":      { "row": 7, "frames": 3, "frameDuration": 150, "loop": false, "next": "idle" }
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `frameWidth` | number | Width of each frame in pixels (should match canvas size: 300) |
| `frameHeight` | number | Height of each frame in pixels (should match canvas size: 300) |
| `columns` | number | Number of columns in the sprite sheet |
| `tintable` | boolean | Whether multiply-blend tinting is supported |
| `states` | object | Map of state name → state definition |

### State Definition

| Field | Type | Description |
|-------|------|-------------|
| `row` | number | Row index in the sprite sheet (0-based) |
| `frames` | number | Number of frames for this animation |
| `frameDuration` | number | Duration of each frame in milliseconds |
| `loop` | boolean | Whether the animation loops continuously |
| `next` | string? | State to transition to when a non-looping animation ends (default: `"idle"`) |

## sheet.png Layout

The sprite sheet is a single PNG image organized as a grid:

- **Rows** = animation states (one row per state)
- **Columns** = frames within each state
- **Cell size** = `frameWidth × frameHeight` (typically 300×300)
- **Total size** = `columns × frameWidth` by `rows × frameHeight`

For the default 8-column, 8-row layout: **2400×2400 pixels**.

```
Col:  0     1     2     3     4     5     6     7
Row 0: [idle frame 0] [idle frame 1] ... [idle frame 5] [empty] [empty]
Row 1: [blink 0] [blink 1] [blink 2] [empty] ...
Row 2: [type-L 0] [type-L 1] [type-L 2] [empty] ...
...
```

Unused cells (beyond `frames` count) are ignored.

## Animation States

| State | Trigger | Behavior |
|-------|---------|----------|
| `idle` | Default state | Loops continuously. After 30s of no input → transitions to `sleep` |
| `idle-blink` | Automatic (every 3-5s during idle) | Plays once, returns to `idle` |
| `typing-left` | Keyboard input (alternating) | Plays once, returns to `idle` |
| `typing-right` | Keyboard input (alternating) | Plays once, returns to `idle` |
| `click-react` | Mouse click | Plays once, returns to `idle` |
| `happy` | AI response / triggerHappy() | Loops for 2 seconds, returns to `idle` |
| `sleep` | 30 seconds of no input | Loops until any input |
| `wake-up` | Any input while sleeping | Plays once, transitions to `idle` (via `next` field) |

## Creating Art Assets

### Requirements

- **Transparent background** (PNG with alpha channel)
- **Consistent character position** across all frames
- Frame size matches `frameWidth × frameHeight` exactly
- Light/neutral colors work best with `tintable: true` (multiply blend darkens colors)

### AI Generation Tips

- **Style prompt**: "chibi cat with keyboard, pixel art / flat illustration style, transparent background"
- **Consistency**: Generate each row as a sequence, keeping the character design consistent
- **Post-processing**:
  1. Remove background (alpha transparency)
  2. Align character to center of each 300×300 cell
  3. Assemble frames into the grid layout
  4. Export as a single PNG

### Tools

- **Stable Diffusion** with ControlNet for consistent character poses
- **DALL-E / Midjourney** for initial concept, then manual cleanup
- **Aseprite / Photoshop** for assembling the final sprite sheet

## Registering a Custom Character

1. Place your `sheet.json` and `sheet.png` in `src/pet/spritesheets/<your-id>/`

2. Add a skin entry in `src/pet/pixel-character.js`:
   ```js
   'my-custom-cat': { name: 'My Cat', tint: null, filter: null, instrument: null, spriteSheet: 'your-id' },
   ```

3. Add a preset entry in `src/pet/live2d-character.js`:
   ```js
   { id: 'my-custom-cat', name: 'My Cat', color: { from: '#ff9ff3', to: '#f368e0' }, type: 'animated', category: 'animated', description: 'My custom animated cat' },
   ```

## Placeholder Mode

If `sheet.png` is missing, the system automatically generates a colored placeholder with labeled rectangles and simple cat silhouettes. This is useful for testing the animation system before final art is ready.
