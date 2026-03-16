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

function saveTasks() {
  try {
    const payload = {
      tasks,
      nextId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
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
  }
}

function addTask(title) {
  const trimmed = title.trim();
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
