const taskTitleInput = document.getElementById("task-title-input");
const addTaskBtn = document.getElementById("add-task-btn");
const sortSelect = document.getElementById("sort-select");
const hideCompletedCheckbox = document.getElementById("hide-completed-checkbox");
const taskListEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");

const STORAGE_KEY = "simple_todo_tasks_v1";

let tasks = [];
let nextId = 1;
let lastAddedId = null;

// #region agent log
function __agentLog(hypothesisId, message, data) {
  try {
    if (typeof fetch !== "function") return;
    fetch("http://127.0.0.1:7902/ingest/d7ad4c92-aee6-417c-89a8-15c74b922bf2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "63eddc" },
      body: JSON.stringify({
        sessionId: "63eddc",
        runId: window.__agentRunId || "pre-fix",
        hypothesisId,
        location: "app.js:__agentLog",
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
// #endregion

// #region agent log
__agentLog("H1_DOM_NULL", "DOM elements resolved", {
  hasTaskTitleInput: !!taskTitleInput,
  hasAddTaskBtn: !!addTaskBtn,
  hasSortSelect: !!sortSelect,
  hasHideCompletedCheckbox: !!hideCompletedCheckbox,
  hasTaskListEl: !!taskListEl,
  hasEmptyStateEl: !!emptyStateEl,
});
// #endregion

function saveTasks() {
  try {
    const payload = {
      tasks,
      nextId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // #region agent log
    __agentLog("H4_STORAGE_WRITE", "saveTasks ok", {
      taskCount: Array.isArray(tasks) ? tasks.length : null,
      nextIdType: typeof nextId,
    });
    // #endregion
  } catch {
    // Ignore storage failures.
    // #region agent log
    __agentLog("H4_STORAGE_WRITE", "saveTasks failed", { storageKey: STORAGE_KEY });
    // #endregion
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // #region agent log
    __agentLog("H2_STORAGE_PARSE", "loadTasks read raw", {
      hasRaw: !!raw,
      rawLength: typeof raw === "string" ? raw.length : null,
    });
    // #endregion
    if (!raw) return;

    const parsed = JSON.parse(raw);
    // #region agent log
    __agentLog("H2_STORAGE_PARSE", "loadTasks parsed", {
      parsedType: typeof parsed,
      hasTasksArray: !!(parsed && Array.isArray(parsed.tasks)),
      nextIdType: parsed ? typeof parsed.nextId : null,
    });
    // #endregion
    if (Array.isArray(parsed.tasks)) {
      tasks = parsed.tasks;
      if (typeof parsed.nextId === "number") {
        nextId = parsed.nextId;
      } else {
        const maxId = tasks.reduce(
          (max, t) =>
            t && typeof t.id === "number" && t.id > max ? t.id : max,
          0
        );
        nextId = maxId + 1;
      }
    }
  } catch {
    // Ignore malformed data.
    // #region agent log
    __agentLog("H2_STORAGE_PARSE", "loadTasks failed (malformed or blocked)", {
      storageKey: STORAGE_KEY,
    });
    // #endregion
  }
}

function addTask(title) {
  const trimmed = title.trim();
  // #region agent log
  __agentLog("H3_INPUT", "addTask called", { titleType: typeof title, trimmedLength: trimmed.length });
  // #endregion
  if (!trimmed) {
    return;
  }

  const now = new Date();
  tasks.push({
    id: nextId++,
    title: trimmed,
    completed: false,
    createdAt: now.getTime(),
  });

  lastAddedId = tasks[tasks.length - 1].id;
  saveTasks();
  taskTitleInput.value = "";
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function toggleTaskCompletion(id) {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTasks();
  renderTasks();
}

function updateTaskTitle(id, newTitle) {
  const trimmed = newTitle.trim();
  if (!trimmed) return;

  tasks = tasks.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
  saveTasks();
  renderTasks();
}

function applySort(a, b) {
  const sortValue = sortSelect.value;

  switch (sortValue) {
    case "created-asc":
      return a.createdAt - b.createdAt;
    case "created-desc":
      return b.createdAt - a.createdAt;
    case "title-asc":
      return a.title.localeCompare(b.title);
    case "title-desc":
      return b.title.localeCompare(a.title);
    case "status":
      if (a.completed === b.completed) {
        return a.createdAt - b.createdAt;
      }
      return a.completed ? 1 : -1;
    default:
      return 0;
  }
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function renderTasks() {
  const hideCompleted = hideCompletedCheckbox.checked;
  let visibleTasks = [...tasks];

  if (hideCompleted) {
    visibleTasks = visibleTasks.filter((t) => !t.completed);
  }

  visibleTasks.sort(applySort);

  // #region agent log
  __agentLog("H5_RENDER", "renderTasks computed visibleTasks", {
    totalTasks: Array.isArray(tasks) ? tasks.length : null,
    visibleTasks: Array.isArray(visibleTasks) ? visibleTasks.length : null,
    hideCompleted,
    sortValue: sortSelect && sortSelect.value,
  });
  // #endregion

  taskListEl.innerHTML = "";

  if (visibleTasks.length === 0) {
    emptyStateEl.style.display = "block";
    return;
  }

  emptyStateEl.style.display = "none";

  for (const task of visibleTasks) {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.id === lastAddedId) {
      li.classList.add("task-item--enter");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleTaskCompletion(task.id));

    const main = document.createElement("div");
    main.className = "task-item-main";

    const titleEl = document.createElement("div");
    titleEl.className = "task-title";
    if (task.completed) {
      titleEl.classList.add("completed");
    }
    titleEl.textContent = task.title;

    titleEl.addEventListener("dblclick", () => {
      const newTitle = prompt("Edit task title:", task.title);
      if (newTitle !== null) {
        updateTaskTitle(task.id, newTitle);
      }
    });

    const metaEl = document.createElement("div");
    metaEl.className = "task-meta";
    metaEl.textContent = `Created ${formatTimestamp(task.createdAt)} • ${
      task.completed ? "Completed" : "Incomplete"
    }`;

    main.appendChild(titleEl);
    main.appendChild(metaEl);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "icon-btn";
    toggleBtn.textContent = task.completed ? "Mark active" : "Mark done";
    toggleBtn.addEventListener("click", () => toggleTaskCompletion(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(main);
    li.appendChild(actions);

    li.addEventListener("click", (event) => {
      const target = event.target;
      if (
        target === checkbox ||
        target.closest("button") ||
        target.closest(".checkbox")
      ) {
        return;
      }
      if (event.detail && event.detail > 1) {
        return;
      }
      toggleTaskCompletion(task.id);
    });

    taskListEl.appendChild(li);
  }

  lastAddedId = null;
}

addTaskBtn.addEventListener("click", () => {
  addTask(taskTitleInput.value);
});

taskTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask(taskTitleInput.value);
  }
});

sortSelect.addEventListener("change", renderTasks);
hideCompletedCheckbox.addEventListener("change", renderTasks);

loadTasks();
renderTasks();
