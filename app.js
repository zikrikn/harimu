const SESSION_KEY = "rencana-demo-session";
const TASKS_KEY_PREFIX = "rencana-tasks:";
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const userName = document.getElementById("user-name");
const userAvatar = document.getElementById("user-avatar");
const dateEyebrow = document.getElementById("date-eyebrow");
const selectedDateLabel = document.getElementById("selected-date");
const plannerNote = document.getElementById("planner-note");
const taskCardTitle = document.getElementById("task-card-title");
const taskCount = document.getElementById("task-count");
const viewToggle = document.getElementById("view-toggle");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const allPlansPanel = document.getElementById("all-plans-panel");
const allPlansList = document.getElementById("all-plans-list");
const allEmptyState = document.getElementById("all-empty-state");
const weekDays = document.getElementById("week-days");
const weekTitle = document.getElementById("week-title");
const calendarDialog = document.getElementById("calendar-dialog");
const calendarTitle = document.getElementById("calendar-title");
const calendarDays = document.getElementById("calendar-days");

const state = {
  email: "",
  selectedDate: dateKey(new Date()),
  calendarMonth: monthStart(new Date()),
  tasksByDate: {},
  view: "day",
};

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("id-ID", options).format(date);
}

function currentTasks() {
  return state.tasksByDate[state.selectedDate] || [];
}

function upcomingEntries() {
  const today = dateKey(new Date());
  return Object.entries(state.tasksByDate)
    .filter(([key, tasks]) => key >= today && tasks.length > 0)
    .sort(([first], [second]) => first.localeCompare(second));
}

function storageKey() {
  return `${TASKS_KEY_PREFIX}${state.email.toLowerCase()}`;
}

function loadTasks() {
  const stored = localStorage.getItem(storageKey());
  state.tasksByDate = stored ? JSON.parse(stored) : {};
}

function saveTasks() {
  localStorage.setItem(storageKey(), JSON.stringify(state.tasksByDate));
}

function displayName(email) {
  const name = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!name) return "Teman";

  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function showPlanner(email) {
  state.email = email.trim();
  state.selectedDate = dateKey(new Date());
  state.calendarMonth = monthStart(new Date());
  state.view = "day";
  loadTasks();
  loginScreen.hidden = true;
  appScreen.hidden = false;

  const name = displayName(state.email);
  userName.textContent = name;
  userAvatar.textContent = name.charAt(0).toUpperCase();
  render();
}

function showLogin() {
  appScreen.hidden = true;
  loginScreen.hidden = false;
  loginForm.reset();
  emailInput.focus();
}

function render() {
  renderDateHeading();
  renderTasks();
  renderWeek();
  if (calendarDialog.open) renderCalendar();
}

function renderDateHeading() {
  if (state.view === "all") {
    dateEyebrow.textContent = "RENCANA MENDATANG";
    selectedDateLabel.textContent = "Semua rencana";
    plannerNote.textContent = "Hari ini dan tanggal berikutnya.";
    plannerNote.hidden = false;
    return;
  }

  const selectedDate = dateFromKey(state.selectedDate);
  const isToday = state.selectedDate === dateKey(new Date());
  dateEyebrow.textContent = isToday ? "HARI INI" : "TANGGAL PILIHAN";
  selectedDateLabel.textContent = formatDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  plannerNote.hidden = true;
}

function renderTasks() {
  const showingAll = state.view === "all";
  const entries = showingAll ? upcomingEntries() : [];
  const tasks = showingAll ? entries.flatMap(([, dateTasks]) => dateTasks) : currentTasks();

  taskCardTitle.textContent = showingAll ? "Per tanggal" : "Tugas";
  taskCount.textContent = `${tasks.length} tugas`;
  viewToggle.textContent = showingAll ? "Harian" : "Semua";
  viewToggle.setAttribute("aria-label", showingAll ? "Kembali ke tugas harian" : "Lihat semua rencana mendatang");
  viewToggle.setAttribute("aria-pressed", String(showingAll));
  taskForm.hidden = showingAll;
  taskList.hidden = showingAll;
  emptyState.hidden = showingAll || tasks.length > 0;
  allPlansPanel.hidden = !showingAll;

  if (showingAll) {
    renderAllPlans(entries);
    return;
  }

  taskList.replaceChildren();
  for (const task of tasks) taskList.append(createTaskItem(task, state.selectedDate));
}

function renderAllPlans(entries) {
  allPlansList.replaceChildren();
  const totalCount = entries.reduce((count, [, tasks]) => count + tasks.length, 0);
  allEmptyState.hidden = totalCount > 0;
  const today = dateKey(new Date());

  for (const [key, tasks] of entries) {
    const date = dateFromKey(key);
    const group = document.createElement("section");
    group.className = "all-plan-group";

    const dateButton = document.createElement("button");
    dateButton.className = "all-plan-date";
    dateButton.type = "button";
    dateButton.setAttribute("aria-label", `Lihat tugas ${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`);

    const label = document.createElement("span");
    label.textContent = key === today
      ? "Hari ini"
      : formatDate(date, { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }) });

    const count = document.createElement("span");
    count.className = "all-plan-count";
    count.textContent = `${tasks.length} tugas`;
    dateButton.append(label, count);
    dateButton.addEventListener("click", () => selectDate(key));

    const list = document.createElement("ul");
    list.className = "task-list";
    list.setAttribute("aria-label", `Tugas ${label.textContent}`);
    for (const task of tasks) list.append(createTaskItem(task, key));

    group.append(dateButton, list);
    allPlansList.append(group);
  }
}

function createTaskItem(task, date) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-complete" : ""}`;

  const checkButton = document.createElement("button");
  checkButton.className = "task-check";
  checkButton.type = "button";
  checkButton.setAttribute("aria-label", task.completed ? `Tandai belum selesai: ${task.text}` : `Tandai selesai: ${task.text}`);
  checkButton.setAttribute("aria-pressed", String(task.completed));
  checkButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5" /></svg>';
  checkButton.addEventListener("click", () => toggleTask(date, task.id));

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-task";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Hapus tugas: ${task.text}`);
  deleteButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6h10M8 6V4h4v2m2 0-.6 10H6.6L6 6m2.5 3v4m3-4v4" /></svg>';
  deleteButton.addEventListener("click", () => deleteTask(date, task.id));

  item.append(checkButton, text, deleteButton);
  return item;
}

function dateStripStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 3, 12);
}

function renderWeek() {
  const selectedDate = dateFromKey(state.selectedDate);
  const start = dateStripStart(selectedDate);
  weekTitle.textContent = formatDate(selectedDate, { month: "long", year: "numeric" });
  weekDays.replaceChildren();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
    const key = dateKey(date);
    const button = document.createElement("button");
    const selected = key === state.selectedDate;
    const today = key === dateKey(new Date());
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const tasks = state.tasksByDate[key] || [];

    button.className = "date-button";
    if (weekend) button.classList.add("is-weekend");
    if (selected) button.classList.add("is-selected");
    if (today) button.classList.add("is-today");
    if (tasks.length > 0) button.classList.add("has-tasks");
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${tasks.length ? `, ${tasks.length} tugas` : ""}`);

    const weekday = document.createElement("span");
    weekday.className = "date-weekday";
    weekday.textContent = formatDate(date, { weekday: "short" });

    const number = document.createElement("span");
    number.className = "date-number";
    number.textContent = String(date.getDate());

    button.append(weekday, number);
    button.addEventListener("click", () => selectDate(key));
    weekDays.append(button);
  }
}

function renderCalendar() {
  const firstDay = monthStart(state.calendarMonth);
  const year = firstDay.getFullYear();
  const month = firstDay.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  calendarTitle.textContent = formatDate(firstDay, { month: "long", year: "numeric" });
  calendarDays.replaceChildren();

  for (let index = 0; index < mondayOffset; index += 1) {
    const blank = document.createElement("span");
    blank.className = "calendar-empty";
    blank.setAttribute("aria-hidden", "true");
    calendarDays.append(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const key = dateKey(date);
    const tasks = state.tasksByDate[key] || [];
    const button = document.createElement("button");
    const selected = key === state.selectedDate;
    const today = key === dateKey(new Date());
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    button.className = "calendar-day";
    if (weekend) button.classList.add("is-weekend");
    if (selected) button.classList.add("is-selected");
    if (today) button.classList.add("is-today");
    if (tasks.length > 0) button.classList.add("has-tasks");
    button.type = "button";
    button.textContent = String(day);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${tasks.length ? `, ${tasks.length} tugas` : ""}`);
    button.addEventListener("click", () => {
      selectDate(key);
      calendarDialog.close();
    });
    calendarDays.append(button);
  }
}

function selectDate(key) {
  state.selectedDate = key;
  state.calendarMonth = monthStart(dateFromKey(key));
  state.view = "day";
  render();
}

function shiftSelectedDate(days) {
  const date = dateFromKey(state.selectedDate);
  date.setDate(date.getDate() + days);
  selectDate(dateKey(date));
}

function addTask(text) {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  if (!state.tasksByDate[state.selectedDate]) state.tasksByDate[state.selectedDate] = [];
  state.tasksByDate[state.selectedDate].push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmedText,
    completed: false,
  });
  saveTasks();
  render();
}

function toggleTask(date, id) {
  const task = (state.tasksByDate[date] || []).find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(date, id) {
  state.tasksByDate[date] = (state.tasksByDate[date] || []).filter((task) => task.id !== id);
  saveTasks();
  render();
}

function toggleView() {
  state.view = state.view === "all" ? "day" : "all";
  state.selectedDate = dateKey(new Date());
  state.calendarMonth = monthStart(new Date());
  render();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;

  const email = emailInput.value.trim();
  sessionStorage.setItem(SESSION_KEY, email);
  showPlanner(email);
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!taskForm.reportValidity()) return;
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});

document.getElementById("logout-button").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  state.email = "";
  state.tasksByDate = {};
  state.view = "day";
  showLogin();
});

document.getElementById("view-toggle").addEventListener("click", toggleView);
document.getElementById("today-button").addEventListener("click", () => selectDate(dateKey(new Date())));
document.getElementById("previous-week").addEventListener("click", () => shiftSelectedDate(-7));
document.getElementById("next-week").addEventListener("click", () => shiftSelectedDate(7));
document.getElementById("calendar-open").addEventListener("click", () => {
  state.calendarMonth = monthStart(dateFromKey(state.selectedDate));
  renderCalendar();
  calendarDialog.showModal();
});
document.getElementById("calendar-today").addEventListener("click", () => {
  selectDate(dateKey(new Date()));
  calendarDialog.close();
});
document.getElementById("calendar-close").addEventListener("click", () => calendarDialog.close());
document.getElementById("previous-month").addEventListener("click", () => {
  state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1, 12);
  renderCalendar();
});
document.getElementById("next-month").addEventListener("click", () => {
  state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1, 12);
  renderCalendar();
});
calendarDialog.addEventListener("click", (event) => {
  if (event.target === calendarDialog) calendarDialog.close();
});

const savedEmail = sessionStorage.getItem(SESSION_KEY);
if (savedEmail) {
  showPlanner(savedEmail);
} else {
  loginScreen.hidden = false;
  appScreen.hidden = true;
}
