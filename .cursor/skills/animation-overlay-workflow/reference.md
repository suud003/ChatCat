# Animation Overlay Reference

## Scope

- Current workflow is for the classic middle-cat overlay animation.
- Goal is to animate only the cat layer and keep keyboard / table / other layers unchanged.

## Key Paths

- Runtime output:
  - `src/pet/cat-overlays/default/sheet.png`
  - `src/pet/cat-overlays/default/sheet.json`
- State source root:
  - `src/pet/animation-sources/classic-cat-overlay/`
- Example state:
  - `src/pet/animation-sources/classic-cat-overlay/drowsy/`

## State Folder Structure

- `reference/base.png`
  - Exported from the current classic cat layer stack
  - Used as alignment reference when drawing animation frames
- `frames/`
  - Main transparent source frames
  - Naming convention: `frame_001.png` ... `frame_999.png`
- `frames-black/`
  - Black-background preview exports
  - For visibility only, not the main bake source

## Current Mechanisms

### 1. State-based workflow

- Each animation state is treated as an independent work unit.
- UI operations like export reference, import frames, export frames, bake, and live preview all act on the currently selected state.

### 2. Frame naming

- Default naming is `frame_001.png`.
- Import/export logic was aligned to this for Procreate Dreams style handoff.
- Legacy plain-number names can still be recognized in some logic, but `frame_001.png` is the intended standard.

### 3. Black-background exports

- Animation manager supports exporting the selected state's frames with a black background.
- Output goes to `frames-black/`.
- This is for preview / alignment only and should not replace the transparent source frames in `frames/`.

### 4. Multi-row sheet support

- A single state can span multiple rows.
- Key config fields:
  - `row`: starting row for the state
  - `columns`: number of frames per row for that state
  - `frames`: total frame count
  - `frameDuration`: per-frame duration in milliseconds
  - `loop`: whether the state loops
  - `next`: optional next state
- Runtime preview and actual overlay rendering both read frame positions using:
  - `col = frameIndex % columns`
  - `rowOffset = Math.floor(frameIndex / columns)`

### 5. Bake safety

- Re-baking clears the destination row block before writing new transparent frames.
- This prevents ghosting / residual pixels from previous versions of the sheet.

### 6. Preview behavior

- Preview panel now preserves the original `800:530` aspect ratio instead of forcing a square.
- This prevents visual stretching during review.

### 7. Live playback

- Animation manager includes a button to play the currently selected state on the real cat in the desktop scene.
- This is useful for checking runtime behavior without waiting for idle triggers.

## Current Example Config Pattern

Example shape for a long state:

```json
{
  "frameWidth": 800,
  "frameHeight": 530,
  "columns": 24,
  "tintable": true,
  "states": {
    "drowsy": {
      "row": 0,
      "columns": 24,
      "frames": 120,
      "frameDuration": 41.67,
      "loop": false
    }
  }
}
```

Interpretation:

- Runtime sheet width is based on `24` columns, not `120` columns.
- `120` frames become `5` rows.
- This avoids ultra-wide textures that can cause rendering issues.

## Relevant Files

- `src/pet/animation-workflow.js`
  - State directories, import/export, black-background export, multi-row bake
- `src/pet/pixel-character.js`
  - Overlay runtime rendering and frame lookup
- `src/renderer.js`
  - Animation manager logic, preview, selected-state workflow, live-play button
- `src/index.html`
  - Animation manager controls
- `src/styles.css`
  - Preview sizing and animation manager styles

## Recommended Agent Behavior

When changing this workflow:

1. Preserve state-based source directories.
2. Preserve `frame_001.png` naming unless the user explicitly wants a new convention.
3. Avoid reverting to one-line huge sheets for long animations.
4. After changing bake or runtime frame lookup, verify both:
   - animation manager preview
   - real cat playback
5. If transparent frames appear overlapped after a bake, inspect whether the target row area is being cleared before compositing.
