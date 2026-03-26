/**
 * DOM helpers for tests that need notification UI elements.
 */

export function setupNotificationDOM() {
  // cat-bubble
  let bubble = document.getElementById('cat-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'cat-bubble';
    bubble.classList.add('hidden');
    document.body.appendChild(bubble);
  }

  // bubble-stack
  let stack = document.getElementById('bubble-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'bubble-stack';
    document.body.appendChild(stack);
  }

  // proactive-dot
  let dot = document.getElementById('proactive-dot');
  if (!dot) {
    dot = document.createElement('div');
    dot.id = 'proactive-dot';
    dot.classList.add('hidden');
    document.body.appendChild(dot);
  }

  return { bubble, stack, dot };
}

export function cleanupDOM() {
  for (const id of ['cat-bubble', 'bubble-stack', 'proactive-dot']) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}
