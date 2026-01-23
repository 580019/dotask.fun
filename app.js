const STORAGE = { tasks: "noteypad.tasks", goals: "noteypad.goals" };

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function gid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let tasks = read(STORAGE.tasks);
let goals = read(STORAGE.goals);

const tabButtons = Array.from(document.querySelectorAll(".tab"));
const views = Array.from(document.querySelectorAll(".view"));
tabButtons.forEach(b => {
  b.addEventListener("click", () => {
    tabButtons.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const target = document.querySelector(b.dataset.target);
    views.forEach(v => v.classList.remove("active"));
    target.classList.add("active");
  });
});

const taskForm = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskPriority = document.getElementById("task-priority");
const taskFrequency = document.getElementById("task-frequency");
const taskGroup = document.getElementById("task-group");
const dailyPanels = document.getElementById("daily-panels");
const weeklyPanels = document.getElementById("weekly-panels");
const taskGroupSelect = document.getElementById("task-group-select");
const dailyProgressLabel = document.getElementById("daily-progress-label");
const dailyProgressBar = document.getElementById("daily-progress-bar");
const weeklyProgressLabel = document.getElementById("weekly-progress-label");
const weeklyProgressBar = document.getElementById("weekly-progress-bar");
const dailyResetBtn = document.getElementById("daily-reset");
const weeklyResetBtn = document.getElementById("weekly-reset");

taskForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) return;
  const priority = taskPriority.value;
  const frequency = taskFrequency.value;
  const groupInput = taskGroup.value.trim();
  const groupSelected = taskGroupSelect.value.trim();
  const group = groupInput || groupSelected;
  if (!group) return;
  tasks.push({ id: gid(), title, priority, frequency, group, completed: false, createdAt: Date.now(), order: tasks.length });
  write(STORAGE.tasks, tasks);
  taskTitle.value = "";
  taskGroup.value = "";
  taskGroupSelect.value = "";
  renderTasks();
});

dailyResetBtn.addEventListener("click", () => {
  for (const t of tasks) if (t.frequency === "daily") t.completed = false;
  write(STORAGE.tasks, tasks);
  renderTasks();
});
weeklyResetBtn.addEventListener("click", () => {
  for (const t of tasks) if (t.frequency === "weekly") t.completed = false;
  write(STORAGE.tasks, tasks);
  renderTasks();
});

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const list = m.get(k);
    if (list) list.push(item); else m.set(k, [item]);
  }
  return m;
}

function percent(a, b) {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

function taskItemHTML(t) {
  const dotClass = t.priority === "high" ? "priority-high" : t.priority === "moderate" ? "priority-moderate" : "priority-neutral";
  const completedClass = t.completed ? "completed" : "";
  return `
    <div class="task-item" data-task-id="${t.id}" draggable="true">
      <input type="checkbox" ${t.completed ? "checked" : ""} data-action="toggle-task">
      <div class="task-main">
        <div class="title-row">
          <span class="priority-dot ${dotClass}"></span>
          <div class="item-title ${completedClass}">${t.title}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn" data-action="delete-task">Delete</button>
      </div>
    </div>
  `;
}

function renderGrouped(container, list, frequency) {
  container.innerHTML = "";
  const withGroup = list.filter(t => t.group && t.group.trim().length);
  const m = groupBy(withGroup, t => t.group.trim());
  const names = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const items = m.get(name).slice().sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
    const html = `
      <div class="panel">
        <div class="group" data-group-name="${name}" data-frequency="${frequency}">
          <div class="group-header">
            <div class="group-title">${name}</div>
            <div class="group-actions">
              <button class="btn" data-action="edit-group">Rename</button>
            </div>
          </div>
          <div class="group-edit" style="display:none">
            <input type="text" class="group-edit-input" value="${name}">
            <button class="btn" data-action="save-group">Save</button>
            <button class="btn" data-action="cancel-group">Cancel</button>
          </div>
          <div class="group-items">
            ${items.map(taskItemHTML).join("")}
          </div>
        </div>
      </div>
    `;
    const div = document.createElement("div");
    div.innerHTML = html;
    container.appendChild(div.firstElementChild);
  }
}

function renderTaskProgress() {
  const daily = tasks.filter(t => t.frequency === "daily");
  const weekly = tasks.filter(t => t.frequency === "weekly");
  const dDone = daily.filter(t => t.completed).length;
  const wDone = weekly.filter(t => t.completed).length;
  dailyProgressLabel.textContent = `Daily Progress: ${dDone}/${daily.length}`;
  weeklyProgressLabel.textContent = `Weekly Progress: ${wDone}/${weekly.length}`;
  dailyProgressBar.style.width = percent(dDone, daily.length) + "%";
  weeklyProgressBar.style.width = percent(wDone, weekly.length) + "%";
}

function renderTasks() {
  const daily = tasks.filter(t => t.frequency === "daily");
  const weekly = tasks.filter(t => t.frequency === "weekly");
  renderGrouped(dailyPanels, daily, "daily");
  renderGrouped(weeklyPanels, weekly, "weekly");
  if (dailyPanels) dailyPanels.style.display = daily.length ? "" : "none";
  if (weeklyPanels) weeklyPanels.style.display = weekly.length ? "" : "none";
  renderTaskProgress();
  updateGroupDropdown();
}

function handleTaskContainer(container) {
  container.addEventListener("change", e => {
    const action = e.target.dataset.action;
    if (action !== "toggle-task") return;
    const wrap = e.target.closest(".task-item");
    const id = wrap.dataset.taskId;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx].completed = e.target.checked;
      write(STORAGE.tasks, tasks);
      renderTasks();
    }
  });
  container.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "delete-task") {
      const wrap = btn.closest(".task-item");
      const id = wrap.dataset.taskId;
      tasks = tasks.filter(t => t.id !== id);
      write(STORAGE.tasks, tasks);
      renderTasks();
      return;
    }
    if (action === "edit-group") {
      const groupEl = btn.closest(".group");
      if (!groupEl) return;
      const header = groupEl.querySelector(".group-header");
      const edit = groupEl.querySelector(".group-edit");
      if (header && edit) { header.style.display = "none"; edit.style.display = ""; }
      return;
    }
    if (action === "cancel-group") {
      const groupEl = btn.closest(".group");
      if (!groupEl) return;
      const header = groupEl.querySelector(".group-header");
      const edit = groupEl.querySelector(".group-edit");
      if (header && edit) { edit.style.display = "none"; header.style.display = ""; }
      return;
    }
    if (action === "save-group") {
      const groupEl = btn.closest(".group");
      if (!groupEl) return;
      const oldName = (groupEl.dataset.groupName || "").trim();
      const frequency = (groupEl.dataset.frequency || "").trim();
      const input = groupEl.querySelector(".group-edit-input");
      const newName = input ? input.value.trim() : "";
      if (!newName || newName === oldName) {
        renderTasks();
        return;
      }
      renameGroup(frequency, oldName, newName);
      renderTasks();
      return;
    }
  });
}

handleTaskContainer(dailyPanels);
handleTaskContainer(weeklyPanels);

function reorderTaskCrossGroup(targetFrequency, targetGroupName, sourceId, targetId) {
  const source = tasks.find(t => t.id === sourceId);
  if (!source) return;
  const prevFrequency = source.frequency;
  const prevGroupName = (source.group || "").trim();
  source.frequency = targetFrequency;
  source.group = targetGroupName;

  // Normalize orders in previous group (after removal)
  const prevList = tasks.filter(t => t.frequency === prevFrequency && (t.group || "").trim() === prevGroupName && t.id !== sourceId)
    .slice()
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  for (let i = 0; i < prevList.length; i++) {
    const t = prevList[i];
    const idx = tasks.findIndex(x => x.id === t.id);
    tasks[idx].order = i;
  }

  // Build target list and insert source at desired position
  let targetList = tasks.filter(t => t.frequency === targetFrequency && (t.group || "").trim() === targetGroupName && t.id !== sourceId)
    .slice()
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  let destIdx = targetId ? targetList.findIndex(x => x.id === targetId) : targetList.length;
  if (destIdx < 0) destIdx = targetList.length;
  targetList.splice(destIdx, 0, source);

  // Renumber orders in target group
  for (let i = 0; i < targetList.length; i++) {
    const t = targetList[i];
    const idx = tasks.findIndex(x => x.id === t.id);
    tasks[idx].order = i;
  }

  write(STORAGE.tasks, tasks);
}

function enableDrag(container, frequency) {
  container.addEventListener("dragstart", e => {
    const item = e.target.closest(".task-item");
    if (!item) return;
    e.dataTransfer.setData("text/plain", item.dataset.taskId);
    e.dataTransfer.effectAllowed = "move";
  });
  container.addEventListener("dragover", e => {
    e.preventDefault();
  });
  container.addEventListener("drop", e => {
    const groupEl = e.target.closest(".group");
    if (!groupEl) return;
    const titleEl = groupEl.querySelector(".group-title");
    const groupName = titleEl ? titleEl.textContent : "";
    const sourceId = e.dataTransfer.getData("text/plain");
    const targetItem = e.target.closest(".task-item");
    const targetId = targetItem ? targetItem.dataset.taskId : null;
    if (groupName) {
      reorderTaskCrossGroup(frequency, groupName, sourceId, targetId);
      renderTasks();
    }
  });
}

enableDrag(dailyPanels, "daily");
enableDrag(weeklyPanels, "weekly");

function updateGroupDropdown() {
  if (!taskGroupSelect) return;
  const names = Array.from(new Set(tasks.map(t => (t.group || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const options = ['<option value="">Select existing group</option>'].concat(names.map(n => `<option value="${n}">${n}</option>`)).join("");
  taskGroupSelect.innerHTML = options;
}

function renormalizeGroupOrders(frequency, groupName) {
  const list = tasks.filter(t => t.frequency === frequency && (t.group || "").trim() === groupName)
    .slice()
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    const idx = tasks.findIndex(x => x.id === t.id);
    tasks[idx].order = i;
  }
}

function renameGroup(frequency, oldName, newName) {
  for (const t of tasks) {
    if (t.frequency === frequency && (t.group || "").trim() === oldName) {
      t.group = newName;
    }
  }
  renormalizeGroupOrders(frequency, oldName);
  renormalizeGroupOrders(frequency, newName);
  write(STORAGE.tasks, tasks);
}
const goalForm = document.getElementById("goal-form");
const goalTitle = document.getElementById("goal-title");
const goalPriority = document.getElementById("goal-priority");
const goalTimeframe = document.getElementById("goal-timeframe");
const monthlyGoals = document.getElementById("monthly-goals");
const milestoneGoals = document.getElementById("milestone-goals");
const yearGoals = document.getElementById("year-goals");
const monthlyProgressLabel = document.getElementById("monthly-progress-label");
const monthlyProgressBar = document.getElementById("monthly-progress-bar");
const milestoneProgressLabel = document.getElementById("milestone-progress-label");
const milestoneProgressBar = document.getElementById("milestone-progress-bar");
const yearProgressLabel = document.getElementById("year-progress-label");
const yearProgressBar = document.getElementById("year-progress-bar");

goalForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = goalTitle.value.trim();
  if (!title) return;
  const priority = goalPriority.value;
  const timeframe = goalTimeframe.value;
  goals.push({ id: gid(), title, priority, timeframe, completed: false, notes: [], createdAt: Date.now() });
  write(STORAGE.goals, goals);
  goalTitle.value = "";
  renderGoals();
});

function goalItemHTML(g) {
  const dotClass = g.priority === "high" ? "priority-high" : g.priority === "moderate" ? "priority-moderate" : "priority-neutral";
  const completedClass = g.completed ? "completed" : "";
  const notesHtml = (g.notes || []).map(n => `
    <div class="note" data-note-id="${n.id}">
      <div class="note-view">
        <div>${n.text}</div>
        <div class="muted">${new Date(n.createdAt).toLocaleString()}</div>
        <div class="note-actions">
          <button class="btn" data-action="edit-note">Edit</button>
          <button class="btn" data-action="delete-note">Remove</button>
          <button class="btn" data-action="toggle-note-history">History</button>
        </div>
      </div>
      <div class="note-edit" style="display:none">
        <input type="text" class="note-edit-input" value="${n.text}">
        <button class="btn" data-action="save-note-edit">Save</button>
        <button class="btn" data-action="cancel-note-edit">Cancel</button>
      </div>
      <div class="note-history" style="display:none">
        ${(n.edits || []).map(h => `<div class="muted">${new Date(h.editedAt).toLocaleString()} — ${h.text}</div>`).join("")}
      </div>
    </div>
  `).join("");
  return `
    <div class="goal-item" data-goal-id="${g.id}">
      <input type="checkbox" ${g.completed ? "checked" : ""} data-action="toggle-goal">
      <div class="goal-main">
        <div class="title-row">
          <span class="priority-dot ${dotClass}"></span>
          <div class="item-title ${completedClass}">${g.title}</div>
        </div>
        <div class="muted">${g.timeframe === "monthly" ? "Monthly" : g.timeframe === "milestone" ? "Next Milestone" : "Year"}</div>
        <div class="notes">
          <input type="text" class="note-input" placeholder="Add side note">
          <button class="btn" data-action="add-note">Add Note</button>
        </div>
        <div class="note-list">${notesHtml}</div>
      </div>
      <div class="actions">
        <button class="btn" data-action="delete-goal">Delete</button>
      </div>
    </div>
  `;
}

function renderGoals() {
  const monthly = goals.filter(g => g.timeframe === "monthly");
  const milestone = goals.filter(g => g.timeframe === "milestone");
  const year = goals.filter(g => g.timeframe === "year");
  monthlyGoals.innerHTML = monthly.map(goalItemHTML).join("");
  milestoneGoals.innerHTML = milestone.map(goalItemHTML).join("");
  yearGoals.innerHTML = year.map(goalItemHTML).join("");
  const mDone = monthly.filter(g => g.completed).length;
  const msDone = milestone.filter(g => g.completed).length;
  const yDone = year.filter(g => g.completed).length;
  monthlyProgressLabel.textContent = `Monthly Progress: ${mDone}/${monthly.length}`;
  milestoneProgressLabel.textContent = `Milestone Progress: ${msDone}/${milestone.length}`;
  yearProgressLabel.textContent = `Year Progress: ${yDone}/${year.length}`;
  monthlyProgressBar.style.width = percent(mDone, monthly.length) + "%";
  milestoneProgressBar.style.width = percent(msDone, milestone.length) + "%";
  yearProgressBar.style.width = percent(yDone, year.length) + "%";
}

function handleGoalsContainer(container) {
  container.addEventListener("change", e => {
    const action = e.target.dataset.action;
    if (action !== "toggle-goal") return;
    const wrap = e.target.closest(".goal-item");
    const id = wrap.dataset.goalId;
    const idx = goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      goals[idx].completed = e.target.checked;
      write(STORAGE.goals, goals);
      renderGoals();
    }
  });
  container.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const wrap = btn.closest(".goal-item");
    const id = wrap.dataset.goalId;
    if (action === "delete-goal") {
      goals = goals.filter(g => g.id !== id);
      write(STORAGE.goals, goals);
      renderGoals();
      return;
    }
    if (action === "add-note") {
      const input = wrap.querySelector(".note-input");
      const text = input.value.trim();
      if (!text) return;
      const g = goals.find(x => x.id === id);
      if (!g.notes) g.notes = [];
      g.notes.push({ id: gid(), text, createdAt: Date.now(), edits: [] });
      input.value = "";
      write(STORAGE.goals, goals);
      renderGoals();
      return;
    }
    if (action === "delete-note") {
      const noteEl = btn.closest(".note");
      if (!noteEl) return;
      const noteId = noteEl.dataset.noteId;
      const g = goals.find(x => x.id === id);
      g.notes = (g.notes || []).filter(n => n.id !== noteId);
      write(STORAGE.goals, goals);
      renderGoals();
      return;
    }
    if (action === "edit-note") {
      const noteEl = btn.closest(".note");
      if (!noteEl) return;
      const view = noteEl.querySelector(".note-view");
      const edit = noteEl.querySelector(".note-edit");
      view.style.display = "none";
      edit.style.display = "";
      return;
    }
    if (action === "cancel-note-edit") {
      const noteEl = btn.closest(".note");
      if (!noteEl) return;
      const view = noteEl.querySelector(".note-view");
      const edit = noteEl.querySelector(".note-edit");
      edit.style.display = "none";
      view.style.display = "";
      return;
    }
    if (action === "save-note-edit") {
      const noteEl = btn.closest(".note");
      if (!noteEl) return;
      const noteId = noteEl.dataset.noteId;
      const input = noteEl.querySelector(".note-edit-input");
      const newText = input.value.trim();
      if (!newText) return;
      const g = goals.find(x => x.id === id);
      const note = (g.notes || []).find(n => n.id === noteId);
      if (!note.edits) note.edits = [];
      note.edits.push({ text: note.text, editedAt: Date.now() });
      note.text = newText;
      write(STORAGE.goals, goals);
      renderGoals();
      return;
    }
    if (action === "toggle-note-history") {
      const noteEl = btn.closest(".note");
      if (!noteEl) return;
      const history = noteEl.querySelector(".note-history");
      history.style.display = history.style.display === "none" || history.style.display === "" ? "block" : "none";
      return;
    }
  });
}

handleGoalsContainer(monthlyGoals);
handleGoalsContainer(milestoneGoals);
handleGoalsContainer(yearGoals);

renderTasks();
renderGoals();
