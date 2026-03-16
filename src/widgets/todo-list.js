/**
 * Todo List widget.
 *
 * Lightweight task manager with priority levels (high/medium/low),
 * optional due time, and completion tracking.
 * Integrates with AffectionSystem (complete → +5 affinity).
 *
 * NOTE: Container/close/maximize/drag are managed by the parent tabbed panel
 * (setupTabbedPanel in renderer.js). This class only manages inner content.
 */

export class TodoList {
  constructor(affectionSystem) {
    this._affection = affectionSystem;

    // DOM refs (inner content only)
    this._input = document.getElementById('todo-input');
    this._addBtn = document.getElementById('todo-add-btn');
    this._list = document.getElementById('todo-list');
    this._summary = document.getElementById('todo-summary');

    // State
    this._todos = [];  // { id, text, priority, completed, createdAt, dueAt? }
    this._nextId = 1;

    // Reminder callback (for cat bubble)
    this._onReminder = null;
    this._reminderInterval = null;

    this._init();
  }

  _init() {
    this._addBtn.addEventListener('click', () => this._addFromInput());
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addFromInput();
    });

    this._loadTodos();

    // Check reminders every 30s
    this._reminderInterval = setInterval(() => this._checkReminders(), 30_000);
  }

  set onReminder(fn) { this._onReminder = fn; }

  /** Add a todo programmatically (e.g., from AI chat parsing) */
  addTodo(text, priority = 'medium', dueAt = null) {
    const todo = {
      id: this._nextId++,
      text,
      priority,
      completed: false,
      createdAt: Date.now(),
      dueAt,
      reminded: false,
    };
    this._todos.unshift(todo);
    this._render();
    this._save();
    return todo;
  }

  destroy() {
    clearInterval(this._reminderInterval);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                           */
  /* ------------------------------------------------------------------ */

  _addFromInput() {
    const text = this._input.value.trim();
    if (!text) return;

    // Parse priority from prefix: !high, !low
    let priority = 'medium';
    let cleanText = text;
    if (text.startsWith('!high ') || text.startsWith('!h ')) {
      priority = 'high';
      cleanText = text.replace(/^!(?:high|h)\s+/, '');
    } else if (text.startsWith('!low ') || text.startsWith('!l ')) {
      priority = 'low';
      cleanText = text.replace(/^!(?:low|l)\s+/, '');
    }

    this.addTodo(cleanText, priority);
    this._input.value = '';
    this._input.focus();
  }

  _toggleSelectAll(checked) {
    for (const todo of this._todos) {
      if (checked && !todo.completed) {
        todo.completed = true;
        if (this._affection) this._affection.onTodoComplete();
      } else if (!checked && todo.completed) {
        todo.completed = false;
      }
    }
    this._render();
    this._save();
  }

  _toggleComplete(id) {
    const todo = this._todos.find(t => t.id === id);
    if (!todo) return;

    todo.completed = !todo.completed;

    if (todo.completed && this._affection) {
      this._affection.onTodoComplete();
    }

    this._render();
    this._save();
  }

  _deleteTodo(id) {
    this._todos = this._todos.filter(t => t.id !== id);
    this._render();
    this._save();
  }

  _render() {
    this._list.innerHTML = '';

    // Select-all header (only show when there are todos)
    if (this._todos.length > 0) {
      const selectAllRow = document.createElement('div');
      selectAllRow.className = 'todo-select-all';

      const selectAllCb = document.createElement('input');
      selectAllCb.type = 'checkbox';
      const incomplete = this._todos.filter(t => !t.completed);
      selectAllCb.checked = incomplete.length === 0;
      selectAllCb.indeterminate = incomplete.length > 0 && incomplete.length < this._todos.length;
      selectAllCb.addEventListener('change', () => this._toggleSelectAll(selectAllCb.checked));

      const selectAllLabel = document.createElement('span');
      selectAllLabel.className = 'todo-select-all-label';
      selectAllLabel.textContent = '全选';

      selectAllRow.appendChild(selectAllCb);
      selectAllRow.appendChild(selectAllLabel);
      this._list.appendChild(selectAllRow);
    }

    for (const todo of this._todos) {
      const item = document.createElement('div');
      item.className = 'todo-item' + (todo.completed ? ' completed' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => this._toggleComplete(todo.id));

      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = todo.text;

      const priorityBadge = document.createElement('span');
      priorityBadge.className = `todo-priority ${todo.priority}`;
      priorityBadge.textContent = todo.priority === 'high' ? 'H' : todo.priority === 'low' ? 'L' : 'M';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'todo-delete';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => this._deleteTodo(todo.id));

      item.appendChild(checkbox);
      item.appendChild(textSpan);
      item.appendChild(priorityBadge);
      item.appendChild(deleteBtn);

      this._list.appendChild(item);
    }

    this._updateSummary();
  }

  _updateSummary() {
    const total = this._todos.length;
    const done = this._todos.filter(t => t.completed).length;
    if (total === 0) {
      this._summary.textContent = '';
    } else {
      this._summary.textContent = `${done}/${total} 已完成`;
    }
  }

  _checkReminders() {
    if (!this._onReminder) return;
    const now = Date.now();

    for (const todo of this._todos) {
      if (todo.completed || todo.reminded || !todo.dueAt) continue;
      if (now >= todo.dueAt) {
        todo.reminded = true;
        this._onReminder(todo);
        this._save();
      }
    }
  }

  async _loadTodos() {
    const saved = await window.electronAPI.getStore('todos');
    if (Array.isArray(saved)) {
      this._todos = saved;
      this._nextId = this._todos.reduce((max, t) => Math.max(max, t.id + 1), 1);
    }
    this._render();
  }

  /** Reload todos from store (called when external changes occur) */
  async reload() {
    await this._loadTodos();
  }

  async _save() {
    await window.electronAPI.setStore('todos', this._todos);
  }
}
