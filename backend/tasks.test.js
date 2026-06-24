import test from "node:test";
import assert from "node:assert/strict";
import { createTaskStore, normalizeTitle, ValidationError } from "./tasks.js";

test("task store creates and lists tasks newest first", () => {
  const store = createTaskStore();

  const first = store.create({ title: "Write spec" });
  const second = store.create({ title: "Run validation" });

  assert.equal(first.completed, false);
  assert.deepEqual(
    store.list().map((task) => task.title),
    ["Run validation", "Write spec"]
  );
  assert.equal(second.id, 2);
});

test("task store toggles an existing task", () => {
  const store = createTaskStore();
  const task = store.create({ title: "Toggle me" });

  const toggled = store.toggle(task.id);

  assert.equal(toggled.completed, true);
  assert.equal(store.list()[0].completed, true);
});

test("task store returns null for missing toggle target", () => {
  const store = createTaskStore();

  assert.equal(store.toggle(404), null);
});

test("normalizeTitle rejects empty and long titles", () => {
  assert.throws(() => normalizeTitle("   "), ValidationError);
  assert.throws(() => normalizeTitle("x".repeat(121)), /120 characters/);
});
