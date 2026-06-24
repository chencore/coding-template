const form = document.querySelector("#task-form");
const input = document.querySelector("#task-title");
const message = document.querySelector("#form-message");
const list = document.querySelector("#task-list");
const state = document.querySelector("#task-state");

async function loadTasks() {
  state.textContent = "正在加载任务...";
  try {
    const data = await requestJson("/api/tasks");
    renderTasks(data.tasks);
  } catch (error) {
    list.innerHTML = "";
    state.textContent = `加载失败：${error.message}`;
    state.dataset.status = "error";
  }
}

function renderTasks(tasks) {
  list.innerHTML = "";

  if (tasks.length === 0) {
    state.textContent = "暂无任务，创建一个开始验证纵切。";
    state.dataset.status = "empty";
    return;
  }

  state.textContent = `${tasks.length} 个任务`;
  state.dataset.status = "ready";

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "task-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-toggle";
    button.ariaPressed = String(task.completed);
    button.innerHTML = `
      <span class="task-checkbox" aria-hidden="true">${task.completed ? "✓" : ""}</span>
      <span class="task-title">${escapeHtml(task.title)}</span>
    `;
    button.addEventListener("click", async () => {
      await toggleTask(task.id);
    });

    item.append(button);
    list.append(item);
  }
}

async function toggleTask(id) {
  message.textContent = "";
  try {
    await requestJson(`/api/tasks/${id}/toggle`, { method: "POST" });
    await loadTasks();
  } catch (error) {
    message.textContent = `更新失败：${error.message}`;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const title = input.value.trim();
  if (!title) {
    message.textContent = "请输入任务标题。";
    input.focus();
    return;
  }

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;
  submitButton.textContent = "创建中...";

  try {
    await requestJson("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title })
    });
    input.value = "";
    message.textContent = "任务已创建。";
    await loadTasks();
  } catch (error) {
    message.textContent = `创建失败：${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "创建任务";
  }
});

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadTasks();
