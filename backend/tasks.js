export function createTaskStore(initialTasks = []) {
  let nextId = 1;
  const tasks = [];

  for (const task of initialTasks) {
    const normalized = normalizeTask(task, nextId);
    tasks.push(normalized);
    nextId = Math.max(nextId, normalized.id + 1);
  }

  return {
    list() {
      return tasks.map(toPublicTask);
    },

    create(input) {
      const title = normalizeTitle(input?.title);
      const task = {
        id: nextId++,
        title,
        completed: false,
        createdAt: new Date().toISOString()
      };
      tasks.unshift(task);
      return toPublicTask(task);
    },

    toggle(id) {
      const task = tasks.find((item) => item.id === Number(id));
      if (!task) {
        return null;
      }
      task.completed = !task.completed;
      return toPublicTask(task);
    }
  };
}

export function normalizeTitle(value) {
  if (typeof value !== "string") {
    throw new ValidationError("Task title is required.");
  }

  const title = value.trim();
  if (title.length === 0) {
    throw new ValidationError("Task title is required.");
  }
  if (title.length > 120) {
    throw new ValidationError("Task title must be 120 characters or fewer.");
  }

  return title;
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

function normalizeTask(task, fallbackId) {
  return {
    id: Number.isInteger(task.id) ? task.id : fallbackId,
    title: normalizeTitle(task.title),
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function toPublicTask(task) {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    createdAt: task.createdAt
  };
}
