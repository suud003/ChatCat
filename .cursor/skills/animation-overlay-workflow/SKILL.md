---
name: animation-overlay-workflow
description: Summarizes the ChatCat cat overlay animation workflow, including animation manager usage, frame import/export, black-background exports, frame_001 naming, and multi-row spritesheet baking. Use when the user mentions overlay animation, animation manager, spritesheet baking, Procreate Dreams alignment, frame sequence import/export, or cat animation debugging.
---

# Animation Overlay Workflow

## Use This Skill When

- User asks about `overlay` animation workflow
- User asks how to import/export frames or bake a spritesheet
- User mentions `frame_001.png`, Procreate Dreams, black background export, or multi-row sheet
- User wants to debug the current cat animation in the animation manager

## Core Model

- This workflow only targets the middle cat layer, not the keyboard or other desk elements.
- Each animation state is an independent work unit.
- Source files live under `src/pet/animation-sources/classic-cat-overlay/<state>/`.
- Runtime output still goes to `src/pet/cat-overlays/default/sheet.png` and `src/pet/cat-overlays/default/sheet.json`.

## Directory Contract

- `reference/base.png`: alignment reference for the selected state
- `frames/`: transparent source frames used for baking
- `frames-black/`: optional black-background preview exports

## Naming Contract

- Frame files should use `frame_001.png`, `frame_002.png`, `frame_003.png`
- Import/export logic accepts this naming as the default convention

## Animation Manager Workflow

1. Open animation manager and select the target state.
2. Export `reference/base.png` if alignment reference is needed.
3. Put transparent source frames into `frames/`.
4. If preview visibility is poor, export black-background frames into `frames-black/`.
5. Bake the current state back into the runtime sheet.
6. Reload animation resources or use the live-play button to verify the result on the real cat.

## Sheet Rules

- `frameWidth` and `frameHeight` define each frame size.
- `states.<name>.frames` is the frame count for that state.
- `states.<name>.columns` defines how many frames appear per row for that state.
- `states.<name>.row` is the starting row of that state.
- Long states should use multi-row sheets instead of one ultra-wide strip.

## Important Runtime Behavior

- Preview canvas should preserve the original `800:530` aspect ratio.
- The animation manager has a direct action to play the currently selected state on the real cat.
- Non-looping states disappear after finishing unless they define `next` or the runtime is changed to hold the last frame.

## Implementation Notes

- Baking is implemented in `src/pet/animation-workflow.js`.
- Runtime overlay rendering is implemented in `src/pet/pixel-character.js`.
- Animation manager preview and controls are implemented in `src/renderer.js` and `src/index.html`.

## Additional Reference

- For the current project-specific rules, paths, and debugging notes, read [reference.md](reference.md).
