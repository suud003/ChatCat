const _transitionTimers = new WeakMap();

/**
 * Capture current panel rect before tab switch.
 * Keeps bottom-right anchor stable when panel height changes.
 */
export function capturePanelAnchor(container, { isVisible = true, isMaximized = false } = {}) {
  if (!container || !isVisible || isMaximized) return null;
  if (container.classList.contains('hidden') || container.classList.contains('maximized')) return null;

  const rect = container.getBoundingClientRect();
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Re-anchor panel after tab switch and optionally run easing animation.
 */
export function applyPanelAnchorTransition(
  container,
  anchorRect,
  { animate = true, durationMs = 340 } = {}
) {
  if (!container || !anchorRect) return;
  if (container.classList.contains('hidden') || container.classList.contains('maximized')) return;

  const afterRect = container.getBoundingClientRect();
  const anchorRight = anchorRect.left + anchorRect.width;
  const anchorBottom = anchorRect.top + anchorRect.height;

  const nextLeft = Math.round(anchorRight - afterRect.width);
  const nextTop = Math.round(anchorBottom - afterRect.height);

  if (animate) {
    container.classList.add('panel-tab-switch-anim');
    container.classList.remove('panel-tab-rise');
    // Restart rise animation each switch
    void container.offsetWidth;
    container.classList.add('panel-tab-rise');

    const existing = _transitionTimers.get(container);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      container.classList.remove('panel-tab-switch-anim', 'panel-tab-rise');
      _transitionTimers.delete(container);
    }, durationMs);
    _transitionTimers.set(container, timer);
  }

  container.style.left = `${nextLeft}px`;
  container.style.top = `${nextTop}px`;
  container.style.right = 'auto';
  container.style.bottom = 'auto';
  container.style.transform = 'none';
}
