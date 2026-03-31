// todo.spec.js
// ============================================================
// Playwright E2E tests for the Todo Electron React App
//
// The app is launched ONCE via beforeAll() and closed ONCE
// via afterAll(). All 20 test cases share the same running
// Electron instance. Between tests, beforeEach() resets state
// by deleting all todos so each test starts with a clean slate.
// ============================================================

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const electronPath = require('../../todo-electron-react/node_modules/electron');
let app;
let window;

// ── Lifecycle: launch once, close once ──────────────────────
test.beforeAll(async () => {
  // app = await electron.launch({
  //   args: [path.join(__dirname, '../../todo-electron-react/main.js')],
  // });
  app = await electron.launch({
  executablePath: electronPath,
  args: [path.join(__dirname, '../../todo-electron-react/main.js')],
  });
  window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  // Wait for the React root to mount
  await window.waitForSelector('#root', { timeout: 10000 });
  await window.waitForSelector('#todo-input', { timeout: 10000 });
});

test.afterAll(async () => {
  if (app) await app.close();
});

// ── Reset state before each test ────────────────────────────
test.beforeEach(async () => {
  // Switch to All filter first so all delete buttons are visible
  const allBtn = await window.$('[data-filter="all"]');
  if (allBtn) await allBtn.click();
  await window.waitForTimeout(100);

  // Delete every todo until none remain
  while (true) {
    const deleteButtons = await window.$$('.delete-btn');
    if (deleteButtons.length === 0) break;
    await deleteButtons[0].click();
    await window.waitForTimeout(100);
  }

  // Reset filter to All
  await window.click('[data-filter="all"]');
  await window.waitForTimeout(100);
});

// ── Helper ───────────────────────────────────────────────────
async function addTodo(text) {
  await window.fill('#todo-input', text);
  await window.click('#add-btn');
  await window.waitForTimeout(150);
}

// ════════════════════════════════════════════════════════════
// TEST CASES
// ════════════════════════════════════════════════════════════

test('TC-01: App launches and shows correct title', async () => {
  const title = await window.title();
  expect(title).toBe('Todo App');
});

test('TC-02: Add a single todo task', async () => {
  await addTodo('Buy groceries');

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Buy groceries');
});

test('TC-03: Add multiple todo tasks', async () => {
  await addTodo('Task One');
  await addTodo('Task Two');
  await addTodo('Task Three');

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(3);
});

test('TC-04: Input clears after adding a task', async () => {
  await addTodo('Check input clears');

  const inputValue = await window.inputValue('#todo-input');
  expect(inputValue).toBe('');
});

test('TC-05: Empty input does not add a task', async () => {
  await window.click('#add-btn');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(0);
});

test('TC-06: Add task using Enter key', async () => {
  await window.fill('#todo-input', 'Press Enter task');
  await window.press('#todo-input', 'Enter');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Press Enter task');
});

test('TC-07: Mark a task as completed', async () => {
  await addTodo('Complete me');

  const checkbox = await window.$('.todo-checkbox');
  await checkbox.click();
  await window.waitForTimeout(150);

  const item = await window.$('.todo-item');
  const classList = await item.getAttribute('class');
  expect(classList).toContain('completed');
});

test('TC-08: Completed task has strikethrough text', async () => {
  await addTodo('Strikethrough test');

  const checkbox = await window.$('.todo-checkbox');
  await checkbox.click();
  await window.waitForTimeout(150);

  const textDecoration = await window.$eval(
    '.todo-item.completed .todo-text',
    el => getComputedStyle(el).textDecoration
  );
  expect(textDecoration).toContain('line-through');
});

test('TC-09: Uncheck a completed task', async () => {
  await addTodo('Toggle me');

  const checkbox = await window.$('.todo-checkbox');
  await checkbox.click(); // complete
  await window.waitForTimeout(100);
  await checkbox.click(); // un-complete
  await window.waitForTimeout(150);

  const item = await window.$('.todo-item');
  const classList = await item.getAttribute('class');
  expect(classList).not.toContain('completed');
});

test('TC-10: Delete a task', async () => {
  await addTodo('Delete me');

  let items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  await window.click('.delete-btn');
  await window.waitForTimeout(150);

  items = await window.$$('.todo-item');
  expect(items.length).toBe(0);
});

test('TC-11: Delete one task among many', async () => {
  await addTodo('Keep me 1');
  await addTodo('Delete me');
  await addTodo('Keep me 2');

  const deleteButtons = await window.$$('.delete-btn');
  await deleteButtons[1].click(); // delete the second item
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(2);
});

test('TC-12: Edit a task', async () => {
  await addTodo('Original text');

  await window.click('.edit-btn');
  await window.waitForTimeout(150);

  const editInput = await window.$('.edit-input');
  await editInput.fill('Edited text');
  await window.click('.save-btn');
  await window.waitForTimeout(150);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Edited text');
});

test('TC-13: Cancel edit reverts to original text', async () => {
  await addTodo('Do not change');

  await window.click('.edit-btn');
  await window.waitForTimeout(150);

  const editInput = await window.$('.edit-input');
  await editInput.fill('Changed text');
  await window.click('.cancel-btn');
  await window.waitForTimeout(150);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Do not change');
});

test('TC-14: Stats show correct remaining task count', async () => {
  await addTodo('Task A');
  await addTodo('Task B');
  await addTodo('Task C');

  const checkboxes = await window.$$('.todo-checkbox');
  await checkboxes[0].click();
  await window.waitForTimeout(150);

  const stats = await window.textContent('#stats');
  expect(stats).toContain('2 tasks remaining');
});

test('TC-15: Filter "Active" shows only incomplete tasks', async () => {
  await addTodo('Active task');
  await addTodo('Completed task');

  const checkboxes = await window.$$('.todo-checkbox');
  await checkboxes[1].click();
  await window.waitForTimeout(150);

  await window.click('[data-filter="active"]');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Active task');
});

test('TC-16: Filter "Completed" shows only completed tasks', async () => {
  await addTodo('Will stay active');
  await addTodo('Will be completed');

  const checkboxes = await window.$$('.todo-checkbox');
  await checkboxes[1].click();
  await window.waitForTimeout(150);

  await window.click('[data-filter="completed"]');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Will be completed');
});

test('TC-17: Filter "All" shows all tasks', async () => {
  await addTodo('Task 1');
  await addTodo('Task 2');

  const checkboxes = await window.$$('.todo-checkbox');
  await checkboxes[0].click();
  await window.waitForTimeout(150);

  await window.click('[data-filter="completed"]');
  await window.waitForTimeout(100);
  await window.click('[data-filter="all"]');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(2);
});

test('TC-18: Clear Completed button removes all completed tasks', async () => {
  await addTodo('Keep me');
  await addTodo('Clear me 1');
  await addTodo('Clear me 2');

  const checkboxes = await window.$$('.todo-checkbox');
  await checkboxes[1].click();
  await window.waitForTimeout(100);
  await checkboxes[2].click();
  await window.waitForTimeout(150);

  await window.click('#clear-completed');
  await window.waitForTimeout(150);

  const items = await window.$$('.todo-item');
  expect(items.length).toBe(1);

  const text = await window.textContent('.todo-text');
  expect(text).toBe('Keep me');
});

test('TC-19: Clear Completed button is hidden when no completed tasks', async () => {
  await addTodo('Just an active task');

  const display = await window.$eval('#clear-completed', el =>
    getComputedStyle(el).display
  );
  expect(display).toBe('none');
});

test('TC-20: Empty state message shows when no tasks', async () => {
  // beforeEach already cleared all todos
  const emptyState = await window.$('.empty-state');
  expect(emptyState).not.toBeNull();
});
