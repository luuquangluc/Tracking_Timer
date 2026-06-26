const STORAGE_KEY = "routine-grove-state-v1";
const CORRUPT_STORAGE_KEY = "routine-grove-corrupt-backup";
const TIMER_STORAGE_KEY = "routine-grove-timer-v1";
const CURRENT_STATE_VERSION = 2;
const SECOND_MS = 1000;

const achievements = [
  {
    id: "mam-moi",
    title: "Mầm mới",
    description: "Complete this routine once.",
    target: 1,
    progress: ({ completions }) => completions,
    condition: ({ completions }) => completions >= 1,
  },
  {
    id: "vao-guong",
    title: "Vào guồng",
    description: "Complete this routine 3 times.",
    target: 3,
    progress: ({ completions }) => completions,
    condition: ({ completions }) => completions >= 3,
  },
  {
    id: "giu-nhip",
    title: "Giữ nhịp",
    description: "Reach a 7-day streak with this routine.",
    target: 7,
    progress: ({ streak }) => streak.current,
    condition: ({ streak }) => streak.current >= 7,
  },
  {
    id: "ben-bi",
    title: "Bền bỉ",
    description: "Reach a 21-day streak with this routine.",
    target: 21,
    progress: ({ streak }) => streak.current,
    condition: ({ streak }) => streak.current >= 21,
  },
  {
    id: "cao-thu",
    title: "Cao thủ",
    description: "Reach a 48-day streak with this routine.",
    target: 48,
    progress: ({ streak }) => streak.current,
    condition: ({ streak }) => streak.current >= 48,
  },
];

const achievementLabels = {
  "mam-moi": "First Sprout",
  "vao-guong": "In Rhythm",
  "giu-nhip": "Steady Week",
  "ben-bi": "Deep Roots",
  "cao-thu": "Grove Master",
};

achievements.forEach((achievement) => {
  achievement.title = achievementLabels[achievement.id] || achievement.title;
});

let state = loadState();
let timer = loadTimerState();

const els = {
  routineList: document.querySelector("#routineList"),
  routineCount: document.querySelector("#routineCount"),
  levelLabel: document.querySelector("#levelLabel"),
  totalXpLabel: document.querySelector("#totalXpLabel"),
  levelProgress: document.querySelector("#levelProgress"),
  nextLevelLabel: document.querySelector("#nextLevelLabel"),
  routineTypeLabel: document.querySelector("#routineTypeLabel"),
  activeRoutineName: document.querySelector("#activeRoutineName"),
  editRoutineButton: document.querySelector("#editRoutineButton"),
  newRoutineButton: document.querySelector("#newRoutineButton"),
  timeRemaining: document.querySelector("#timeRemaining"),
  timerStatus: document.querySelector("#timerStatus"),
  timerRing: document.querySelector("#timerRing"),
  currentStepName: document.querySelector("#currentStepName"),
  nextStepName: document.querySelector("#nextStepName"),
  stepProgress: document.querySelector("#stepProgress"),
  stepProgressLabel: document.querySelector("#stepProgressLabel"),
  routineProgress: document.querySelector("#routineProgress"),
  routineProgressLabel: document.querySelector("#routineProgressLabel"),
  rewardTitle: document.querySelector("#rewardTitle"),
  rewardDetail: document.querySelector("#rewardDetail"),
  rewardMeta: document.querySelector("#rewardMeta"),
  startPauseButton: document.querySelector("#startPauseButton"),
  skipStepButton: document.querySelector("#skipStepButton"),
  resetTimerButton: document.querySelector("#resetTimerButton"),
  stepList: document.querySelector("#stepList"),
  totalDurationLabel: document.querySelector("#totalDurationLabel"),
  completedCount: document.querySelector("#completedCount"),
  routineRunCount: document.querySelector("#routineRunCount"),
  currentStreak: document.querySelector("#currentStreak"),
  bestStreak: document.querySelector("#bestStreak"),
  completionRate: document.querySelector("#completionRate"),
  weeklyChart: document.querySelector("#weeklyChart"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  achievementCount: document.querySelector("#achievementCount"),
  achievementList: document.querySelector("#achievementList"),
  garden: document.querySelector("#garden"),
  gardenCount: document.querySelector("#gardenCount"),
  routineDialog: document.querySelector("#routineDialog"),
  routineForm: document.querySelector("#routineForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  editorSummary: document.querySelector("#editorSummary"),
  routineNameInput: document.querySelector("#routineNameInput"),
  stepEditorList: document.querySelector("#stepEditorList"),
  addStepButton: document.querySelector("#addStepButton"),
  deleteRoutineButton: document.querySelector("#deleteRoutineButton"),
  toast: document.querySelector("#toast"),
};

let editingRoutineId = null;

function createSeedState() {
  const now = new Date().toISOString();
  const routineId = makeId();

  return {
    version: CURRENT_STATE_VERSION,
    selectedRoutineId: routineId,
    routines: [
      {
        id: routineId,
        name: "Morning Routine",
        createdAt: now,
        steps: [
          createStep("Breathing Meditation", 7, 0, "meditation"),
          createStep("Mindfulness Meditation", 7, 0, "meditation"),
          createStep("Body Scan", 7, 0, "meditation"),
          createStep("Yoga Stretching", 6, 0, "yoga"),
        ],
      },
    ],
    streaks: {},
    completions: [],
    xp: 0,
    unlockedAchievements: {},
    stats: {
      completedRoutines: 0,
    },
    garden: [],
  };
}

function createStep(name = "New Step", minutes = 5, seconds = 0, type = "custom") {
  return {
    id: makeId(),
    name,
    minutes,
    seconds,
    type,
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createSeedState();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.version || !Array.isArray(parsed.routines)) return createSeedState();
    return migrateState(parsed);
  } catch {
    localStorage.setItem(CORRUPT_STORAGE_KEY, raw);
    return createSeedState();
  }
}

function migrateState(parsed) {
  const seeded = createSeedState();
  const migrated = {
      ...createSeedState(),
      ...parsed,
      version: CURRENT_STATE_VERSION,
      routines: Array.isArray(parsed.routines) ? parsed.routines : seeded.routines,
      streaks: parsed.streaks && typeof parsed.streaks === "object" ? parsed.streaks : {},
      completions: Array.isArray(parsed.completions) ? parsed.completions : [],
      unlockedAchievements: parsed.unlockedAchievements && typeof parsed.unlockedAchievements === "object" ? parsed.unlockedAchievements : {},
      garden: Array.isArray(parsed.garden) ? parsed.garden : [],
      stats: {
        completedRoutines: Number(parsed.stats?.completedRoutines) || 0,
      },
    };

  if (!migrated.routines.find((routine) => routine.id === migrated.selectedRoutineId)) {
    migrated.selectedRoutineId = migrated.routines[0]?.id || null;
  }

  migrated.routines = migrated.routines.map((routine) => ({
    ...routine,
    steps: Array.isArray(routine.steps) ? routine.steps.map((step) => ({
      id: step.id || makeId(),
      name: step.name || "Untitled Step",
      minutes: Math.max(0, Number(step.minutes) || 0),
      seconds: Math.min(59, Math.max(0, Number(step.seconds) || 0)),
      type: step.type || "activity",
    })) : [],
  }));

  return migrated;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Unable to save routine state", error);
    return false;
  }
}

function createIdleTimer(routineId = state.selectedRoutineId) {
  return {
    status: "idle",
    routineId,
    stepIndex: 0,
    elapsedInStep: 0,
    elapsedRoutine: 0,
    lastTickAt: null,
    intervalId: null,
  };
}

function loadTimerState() {
  const saved = readSavedTimer();
  if (!saved || saved.routineId !== state.selectedRoutineId) return createIdleTimer();

  const timerState = {
    ...createIdleTimer(saved.routineId),
    status: ["idle", "paused", "running"].includes(saved.status) ? saved.status : "idle",
    stepIndex: Math.max(0, Number(saved.stepIndex) || 0),
    elapsedInStep: Math.max(0, Number(saved.elapsedInStep) || 0),
    elapsedRoutine: Math.max(0, Number(saved.elapsedRoutine) || 0),
    lastTickAt: Number(saved.lastTickAt) || null,
  };

  if (timerState.status === "running" && timerState.lastTickAt) {
    const elapsedSinceSave = Math.max(0, Math.floor((Date.now() - timerState.lastTickAt) / SECOND_MS));
    timerState.elapsedInStep += elapsedSinceSave;
    timerState.elapsedRoutine += elapsedSinceSave;
    timerState.lastTickAt = Date.now();
    window.setTimeout(() => {
      normalizeTimerProgress();
      startTimerInterval();
      saveTimerState();
      render();
    }, 0);
  }

  return timerState;
}

function readSavedTimer() {
  try {
    return JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || "null");
  } catch {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    return null;
  }
}

function saveTimerState() {
  const snapshot = {
    status: timer.status,
    routineId: timer.routineId,
    stepIndex: timer.stepIndex,
    elapsedInStep: timer.elapsedInStep,
    elapsedRoutine: timer.elapsedRoutine,
    lastTickAt: timer.lastTickAt,
  };
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error("Unable to save timer state", error);
  }
}

function clearTimerState() {
  localStorage.removeItem(TIMER_STORAGE_KEY);
}

function activeRoutine() {
  return state.routines.find((routine) => routine.id === state.selectedRoutineId) || state.routines[0] || null;
}

function durationSeconds(step) {
  const minutes = Number(step.minutes) || 0;
  const seconds = Number(step.seconds) || 0;
  return Math.max(1, Math.round(minutes * 60 + seconds));
}

function routineDuration(routine) {
  return routine.steps.reduce((sum, step) => sum + durationSeconds(step), 0);
}

function formatDuration(secondsValue) {
  const minutes = Math.floor(secondsValue / 60);
  const seconds = secondsValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(secondsValue) {
  if (secondsValue < 60) return `${secondsValue}s`;
  return `${Math.round(secondsValue / 60)}m`;
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function previousDateKey(key) {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}

function levelForXp(xp) {
  let level = 1;
  let remaining = xp;
  let threshold = 100;

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(100 * Math.pow(level, 1.35));
  }

  return { level, remaining, threshold };
}

function setSelectedRoutine(id) {
  state.selectedRoutineId = id;
  timer.routineId = id;
  resetTimer(false);
  saveState();
  render();
}

function render() {
  const routine = activeRoutine();
  renderLevel();
  renderRoutines(routine);
  renderTimer(routine);
  renderSteps(routine);
  renderDashboard(routine);
  renderHistory(routine);
  renderAchievements(routine);
  renderRewardSummary(routine);
  renderGarden();
}

function renderLevel() {
  const levelInfo = levelForXp(state.xp);
  els.levelLabel.textContent = `Level ${levelInfo.level}`;
  els.totalXpLabel.textContent = `${state.xp} XP`;
  els.levelProgress.style.width = `${Math.round((levelInfo.remaining / levelInfo.threshold) * 100)}%`;
  els.nextLevelLabel.textContent = `${levelInfo.threshold - levelInfo.remaining} XP to level ${levelInfo.level + 1}`;
}

function renderRoutines(selected) {
  els.routineCount.textContent = String(state.routines.length);
  els.routineList.replaceChildren();

  if (!state.routines.length) {
    els.routineList.innerHTML = `<div class="routine-card"><strong>No routines yet</strong><span class="routine-meta">Create a routine to start training.</span></div>`;
    return;
  }

  state.routines.forEach((routine) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `routine-card${selected?.id === routine.id ? " active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(routine.name)}</strong>
      <span class="routine-meta">${routine.steps.length} steps - ${formatMinutes(routineDuration(routine))} - ${getStreak(routine.id).current}d streak</span>
    `;
    button.addEventListener("click", () => setSelectedRoutine(routine.id));
    els.routineList.append(button);
  });
}

function renderTimer(routine) {
  const step = routine?.steps[timer.stepIndex] || null;
  const nextStep = routine?.steps[timer.stepIndex + 1] || null;
  const stepTotal = step ? durationSeconds(step) : 1;
  const routineTotal = routine ? routineDuration(routine) : 1;
  const stepPct = Math.min(100, Math.round((timer.elapsedInStep / stepTotal) * 100));
  const routinePct = Math.min(100, Math.round((timer.elapsedRoutine / routineTotal) * 100));
  const remaining = step ? Math.max(0, stepTotal - timer.elapsedInStep) : 0;

  els.routineTypeLabel.textContent = step?.type || "Routine";
  els.activeRoutineName.textContent = routine?.name || "No Routine";
  els.timeRemaining.textContent = formatDuration(remaining);
  els.timerStatus.textContent = timer.status === "running" ? "In progress" : timer.status === "paused" ? "Paused" : "Ready";
  els.currentStepName.textContent = step?.name || "Create a routine";
  els.nextStepName.textContent = nextStep?.name || "Finish line";
  els.stepProgress.style.width = `${stepPct}%`;
  els.stepProgressLabel.textContent = `${stepPct}%`;
  els.routineProgress.style.width = `${routinePct}%`;
  els.routineProgressLabel.textContent = `${routinePct}%`;
  els.timerRing.style.background = `conic-gradient(var(--green) ${stepPct * 3.6}deg, #e9e1d2 0deg)`;
  els.startPauseButton.textContent = timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start Routine";
  els.startPauseButton.disabled = !routine || !routine.steps.length;
  els.skipStepButton.disabled = !routine || !routine.steps.length || timer.status === "idle";
  els.resetTimerButton.disabled = timer.status === "idle" && timer.elapsedRoutine === 0;
  els.editRoutineButton.disabled = !routine;
}

function renderSteps(routine) {
  els.stepList.replaceChildren();
  els.totalDurationLabel.textContent = routine ? formatMinutes(routineDuration(routine)) : "0 min";

  if (!routine?.steps.length) {
    els.stepList.innerHTML = `<li><span class="step-index">-</span><div><strong>No steps</strong><p>Add steps to make this routine runnable.</p></div><span></span></li>`;
    return;
  }

  routine.steps.forEach((step, index) => {
    const li = document.createElement("li");
    const isActive = index === timer.stepIndex;
    const isComplete = timer.status !== "idle" && index < timer.stepIndex;
    li.className = `${isActive ? "active" : ""}${isComplete ? " complete" : ""}`.trim();
    if (isActive) li.setAttribute("aria-current", "step");
    li.innerHTML = `
      <span class="step-index">${index + 1}</span>
      <div>
        <strong>${escapeHtml(step.name)}</strong>
        <p>${step.type} - ${formatMinutes(durationSeconds(step))}</p>
      </div>
      <strong>${formatDuration(durationSeconds(step))}</strong>
    `;
    els.stepList.append(li);
  });
}

function renderDashboard(routine) {
  const streak = routine ? getStreak(routine.id) : { current: 0, best: 0 };
  const routineCompletions = routine ? getRoutineCompletionCount(routine.id) : 0;
  const week = weeklyCounts(routine?.id);
  const completedDays = week.filter((day) => day.count > 0).length;
  const maxCount = Math.max(1, ...week.map((day) => day.count));

  els.completedCount.textContent = String(state.stats.completedRoutines);
  els.routineRunCount.textContent = String(routineCompletions);
  els.currentStreak.textContent = `${streak.current}d`;
  els.bestStreak.textContent = `${streak.best}d`;
  els.completionRate.textContent = `${Math.round((completedDays / 7) * 100)}%`;
  els.weeklyChart.replaceChildren();

  week.forEach((day) => {
    const item = document.createElement("div");
    item.className = "bar";
    item.innerHTML = `
      <span style="height: ${Math.max(8, (day.count / maxCount) * 100)}%"></span>
      <strong>${day.count}</strong>
      <span>${day.label}</span>
    `;
    els.weeklyChart.append(item);
  });
}

function renderRewardSummary(routine) {
  const latest = [...state.completions].reverse().find((item) => !routine || item.routineId === routine.id);
  const streak = routine ? getStreak(routine.id) : { current: 0, best: 0 };

  if (!latest) {
    els.rewardTitle.textContent = "Ready to earn";
    els.rewardDetail.textContent = routine
      ? `Finish ${routine.name} to earn XP, extend the streak, and plant a garden tile.`
      : "Create a routine to start earning XP and streak progress.";
    els.rewardMeta.textContent = `${state.xp} XP banked`;
    return;
  }

  const completedDate = new Date(latest.completedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  els.rewardTitle.textContent = `+${latest.xp} XP earned`;
  els.rewardDetail.textContent = `${latest.routineName} completed on ${completedDate}. Current streak: ${streak.current}d.`;
  els.rewardMeta.textContent = `${state.xp} XP banked`;
}

function renderHistory(routine) {
  const history = [...state.completions]
    .filter((item) => !routine || item.routineId === routine.id)
    .reverse()
    .slice(0, 5);

  els.historyCount.textContent = `${history.length} shown`;
  els.historyList.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("article");
    empty.className = "history-item";
    empty.innerHTML = `<div><strong>No completions yet</strong><p>Run this routine to create the first log.</p></div><span>0 XP</span>`;
    els.historyList.append(empty);
    return;
  }

  history.forEach((item) => {
    const loggedAt = new Date(item.completedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const historyItem = document.createElement("article");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
      <div>
        <strong>${escapeHtml(item.routineName)}</strong>
        <p>${loggedAt}</p>
      </div>
      <span>+${item.xp} XP</span>
    `;
    els.historyList.append(historyItem);
  });
}

function renderAchievements(routine) {
  const progress = getRoutineAchievementProgress(routine);
  const unlockedCount = achievements.filter((achievement) => progress.unlocked[achievement.id]).length;
  els.achievementCount.textContent = `${unlockedCount}/${achievements.length}`;
  els.achievementList.replaceChildren();

  achievements.forEach((achievement) => {
    const unlocked = Boolean(progress.unlocked[achievement.id]);
    const current = Math.min(achievement.target, achievement.progress(progress));
    const pct = Math.round((current / achievement.target) * 100);
    const item = document.createElement("article");
    item.className = `achievement-item${unlocked ? "" : " locked"}`;
    item.innerHTML = `
      <strong>${unlocked ? "Unlocked" : "Locked"} - ${achievement.title}</strong>
      <p>${achievement.description}</p>
    `;
    const count = document.createElement("span");
    count.className = "achievement-progress";
    count.textContent = `${current}/${achievement.target}`;
    const track = document.createElement("div");
    const fill = document.createElement("span");
    track.className = "mini-track";
    track.setAttribute("aria-hidden", "true");
    fill.style.width = `${pct}%`;
    track.append(fill);
    item.append(count, track);
    els.achievementList.append(item);
  });
}

function renderGarden() {
  const plots = Math.max(10, Math.min(30, state.garden.length + 5));
  els.gardenCount.textContent = `${state.garden.length} trees`;
  els.garden.replaceChildren();

  for (let index = 0; index < plots; index += 1) {
    const plot = document.createElement("div");
    const tree = state.garden[index];
    plot.className = `plot${tree ? "" : " empty"}`;
    plot.innerHTML = tree ? `<span class="plant ${tree.symbol}" aria-hidden="true"><i></i><b></b></span>` : `<span aria-hidden="true">+</span>`;
    plot.title = tree ? tree.routineName : "Empty plot";
    els.garden.append(plot);
  }
}

function normalizeTimerProgress() {
  const routine = activeRoutine();
  if (!routine?.steps.length) return;

  const total = routineDuration(routine);
  timer.elapsedRoutine = Math.min(timer.elapsedRoutine, total);

  let remaining = timer.elapsedRoutine;
  let nextIndex = 0;
  while (nextIndex < routine.steps.length) {
    const stepTotal = durationSeconds(routine.steps[nextIndex]);
    if (remaining < stepTotal) break;
    remaining -= stepTotal;
    nextIndex += 1;
  }

  if (nextIndex >= routine.steps.length) {
    completeRoutine();
    return;
  }

  timer.stepIndex = nextIndex;
  timer.elapsedInStep = remaining;
}

function startTimerInterval() {
  stopInterval();
  timer.intervalId = window.setInterval(tick, SECOND_MS);
}

function startPauseTimer() {
  const routine = activeRoutine();
  if (!routine?.steps.length) return;

  if (timer.status === "running") {
    stopInterval();
    timer.status = "paused";
    timer.lastTickAt = null;
    saveTimerState();
    render();
    return;
  }

  timer.status = "running";
  timer.lastTickAt = Date.now();
  startTimerInterval();
  saveTimerState();
  render();
}

function tick() {
  const routine = activeRoutine();
  const step = routine?.steps[timer.stepIndex];
  if (!routine || !step) return completeRoutine();

  const now = Date.now();
  const delta = Math.max(1, Math.floor((now - (timer.lastTickAt || now)) / SECOND_MS));
  timer.lastTickAt = now;
  timer.elapsedInStep += delta;
  timer.elapsedRoutine += delta;

  if (timer.elapsedInStep >= durationSeconds(step)) {
    advanceStep();
  }

  saveTimerState();
  render();
}

function advanceStep() {
  const routine = activeRoutine();
  if (!routine) return;

  if (timer.stepIndex >= routine.steps.length - 1) {
    completeRoutine();
    return;
  }

  timer.stepIndex += 1;
  timer.elapsedInStep = 0;
  timer.lastTickAt = timer.status === "running" ? Date.now() : null;
  saveTimerState();
  showToast(`Next: ${routine.steps[timer.stepIndex].name}`);
  render();
}

function completeRoutine() {
  const routine = activeRoutine();
  if (!routine?.steps.length) return;

  stopInterval();
  timer.status = "idle";
  timer.elapsedRoutine = routineDuration(routine);
  timer.elapsedInStep = durationSeconds(routine.steps[routine.steps.length - 1]);

  const reward = applyCompletionRewards(routine);
  saveState();
  clearTimerState();
  render();
  showToast(`Routine complete: +${reward.xp} XP${reward.unlocked.length ? ` - ${reward.unlocked.join(", ")}` : ""}`);

  window.setTimeout(() => {
    resetTimer(false);
    render();
  }, 1200);
}

function resetTimer(shouldRender = true) {
  stopInterval();
  timer = {
    status: "idle",
    routineId: state.selectedRoutineId,
    stepIndex: 0,
    elapsedInStep: 0,
    elapsedRoutine: 0,
    lastTickAt: null,
    intervalId: null,
  };
  clearTimerState();
  if (shouldRender) render();
}

function stopInterval() {
  if (timer.intervalId) {
    window.clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function applyCompletionRewards(routine) {
  const today = dateKey();
  const streak = getStreak(routine.id);
  const yesterday = previousDateKey(today);

  if (streak.lastCompletedAt === today) {
    streak.current = Math.max(1, streak.current);
  } else if (streak.lastCompletedAt === yesterday) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }

  streak.lastCompletedAt = today;
  streak.best = Math.max(streak.best, streak.current);
  state.streaks[routine.id] = streak;

  const completedMinutes = Math.max(1, Math.ceil(routineDuration(routine) / 60));
  const baseXp = 10 + completedMinutes * 5;
  const streakBonus = streak.current > 0 && streak.current % 7 === 0 ? 50 : 0;
  const xp = baseXp + streakBonus;

  state.xp += xp;
  state.stats.completedRoutines += 1;
  state.completions.push({
    id: makeId(),
    routineId: routine.id,
    routineName: routine.name,
    completedAt: new Date().toISOString(),
    xp,
  });
  state.garden.push({
    routineName: routine.name,
    symbol: gardenSymbol(routine),
    plantedAt: new Date().toISOString(),
  });

  const unlocked = [];
  const progress = getRoutineAchievementProgress(routine);
  achievements.forEach((achievement) => {
    if (!progress.unlocked[achievement.id] && achievement.condition(progress)) {
      progress.unlocked[achievement.id] = new Date().toISOString();
      unlocked.push(achievement.title);
    }
  });
  state.unlockedAchievements[routine.id] = progress.unlocked;

  return { xp, unlocked };
}

function gardenSymbol(routine) {
  const primary = routine.steps[0]?.type;
  if (primary === "meditation") return "meditation";
  if (primary === "yoga") return "yoga";
  if (primary === "study") return "study";
  return "custom";
}

function getStreak(routineId) {
  return state.streaks[routineId] || { current: 0, best: 0, lastCompletedAt: null };
}

function getRoutineCompletionCount(routineId) {
  if (!routineId) return 0;
  return state.completions.filter((item) => item.routineId === routineId).length;
}

function getRoutineAchievementProgress(routine) {
  if (!routine) {
    return { completions: 0, streak: { current: 0, best: 0, lastCompletedAt: null }, unlocked: {} };
  }

  const legacyUnlocked = achievements.reduce((result, achievement) => {
    if (state.unlockedAchievements[achievement.id]) result[achievement.id] = state.unlockedAchievements[achievement.id];
    return result;
  }, {});

  return {
    completions: getRoutineCompletionCount(routine.id),
    streak: getStreak(routine.id),
    unlocked: {
      ...legacyUnlocked,
      ...(state.unlockedAchievements[routine.id] || {}),
    },
  };
}

function weeklyCounts(routineId = null) {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    days.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
      count: state.completions.filter((item) => {
        const matchesDate = item.completedAt.slice(0, 10) === key;
        const matchesRoutine = !routineId || item.routineId === routineId;
        return matchesDate && matchesRoutine;
      }).length,
    });
  }
  return days;
}

function openRoutineDialog(routine = null) {
  editingRoutineId = routine?.id || null;
  els.dialogTitle.textContent = routine ? "Edit Routine" : "New Routine";
  els.deleteRoutineButton.hidden = !routine;
  els.routineNameInput.value = routine?.name || "New Routine";
  renderStepEditor(routine?.steps || [createStep("Focus Block", 5, 0, "study")]);
  els.routineDialog.showModal();
}

function renderStepEditor(steps) {
  els.stepEditorList.replaceChildren();
  steps.forEach((step) => els.stepEditorList.append(createStepEditorRow(step)));
  updateEditorSummary();
}

function createStepEditorRow(step) {
  const row = document.createElement("div");
  row.className = "step-editor-row";
  row.dataset.stepId = step.id;
  row.innerHTML = `
    <label class="field">
      <span>Name</span>
      <input data-field="name" value="${escapeAttribute(step.name)}" maxlength="48" required>
    </label>
    <label class="field">
      <span>Min</span>
      <input data-field="minutes" type="number" min="0" max="180" value="${Number(step.minutes) || 0}" required>
    </label>
    <label class="field">
      <span>Sec</span>
      <input data-field="seconds" type="number" min="0" max="59" step="5" value="${Number(step.seconds) || 0}" required>
    </label>
    <label class="field">
      <span>Type</span>
      <select data-field="type">
        ${["activity", "rest", "meditation", "yoga", "study", "custom"].map((type) => `<option value="${type}"${step.type === type ? " selected" : ""}>${type}</option>`).join("")}
      </select>
    </label>
    <div class="step-row-actions" aria-label="Step order controls">
      <button class="ghost-button icon-step-button" type="button" data-move-step="-1" aria-label="Move step up">Move up</button>
      <button class="ghost-button icon-step-button" type="button" data-move-step="1" aria-label="Move step down">Move down</button>
    </div>
    <button class="ghost-button remove-step-button" type="button" data-remove-step aria-label="Remove step">Remove</button>
  `;

  row.querySelectorAll("[data-move-step]").forEach((button) => {
    button.addEventListener("click", () => moveStepEditorRow(row, Number(button.dataset.moveStep)));
  });

  row.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("input", updateEditorSummary);
    field.addEventListener("change", updateEditorSummary);
  });

  row.querySelector("[data-remove-step]").addEventListener("click", () => {
    if (els.stepEditorList.children.length > 1) row.remove();
    updateEditorSummary();
  });

  return row;
}

function moveStepEditorRow(row, direction) {
  const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  if (direction < 0) {
    els.stepEditorList.insertBefore(row, sibling);
  } else {
    els.stepEditorList.insertBefore(sibling, row);
  }
  updateEditorSummary();
}

function updateEditorSummary() {
  const steps = Array.from(els.stepEditorList.children).map(readStepEditorRow).filter((step) => durationSeconds(step) > 0);
  const total = steps.reduce((sum, step) => sum + durationSeconds(step), 0);
  els.editorSummary.textContent = `${steps.length} steps - ${formatDuration(total)} total`;
}

function readStepEditorRow(row) {
  return {
    id: row.dataset.stepId || makeId(),
    name: row.querySelector('[data-field="name"]').value.trim() || "Untitled Step",
    minutes: Math.max(0, Number(row.querySelector('[data-field="minutes"]').value) || 0),
    seconds: Math.min(59, Math.max(0, Number(row.querySelector('[data-field="seconds"]').value) || 0)),
    type: row.querySelector('[data-field="type"]').value,
  };
}

function saveRoutineFromDialog(event) {
  event.preventDefault();
  const steps = Array.from(els.stepEditorList.children).map(readStepEditorRow).filter((step) => durationSeconds(step) > 0);

  if (!steps.length) {
    showToast("A routine needs at least one timed step.");
    return;
  }

  const name = els.routineNameInput.value.trim() || "Untitled Routine";
  if (editingRoutineId) {
    const routine = state.routines.find((item) => item.id === editingRoutineId);
    if (routine) {
      routine.name = name;
      routine.steps = steps;
    }
  } else {
    const routine = {
      id: makeId(),
      name,
      steps,
      createdAt: new Date().toISOString(),
    };
    state.routines.push(routine);
    state.selectedRoutineId = routine.id;
  }

  saveState();
  resetTimer(false);
  els.routineDialog.close();
  render();
}

function deleteEditingRoutine() {
  if (!editingRoutineId) return;
  const index = state.routines.findIndex((routine) => routine.id === editingRoutineId);
  if (index === -1) return;
  const routine = state.routines[index];
  if (!window.confirm(`Delete "${routine.name}"? Completion history will stay in analytics, but the routine can no longer be edited.`)) {
    return;
  }

  state.routines.splice(index, 1);
  delete state.streaks[editingRoutineId];
  state.selectedRoutineId = state.routines[0]?.id || null;
  saveState();
  resetTimer(false);
  els.routineDialog.close();
  render();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 3600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

els.newRoutineButton.addEventListener("click", () => openRoutineDialog());
els.editRoutineButton.addEventListener("click", () => openRoutineDialog(activeRoutine()));
els.addStepButton.addEventListener("click", () => {
  els.stepEditorList.append(createStepEditorRow(createStep("New Step", 5, 0, "custom")));
  updateEditorSummary();
});
els.deleteRoutineButton.addEventListener("click", deleteEditingRoutine);
els.routineForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  saveRoutineFromDialog(event);
});
els.startPauseButton.addEventListener("click", startPauseTimer);
els.skipStepButton.addEventListener("click", advanceStep);
els.resetTimerButton.addEventListener("click", () => resetTimer(true));

saveState();
render();
