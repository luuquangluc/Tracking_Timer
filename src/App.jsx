import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Clock3,
  Flame,
  Leaf,
  ListChecks,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  Trophy,
  Trash2,
} from "lucide-react";
import { Badge } from "./components/ui/badge.jsx";
import { Button } from "./components/ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog.jsx";
import { Progress } from "./components/ui/progress.jsx";
import { ScrollArea } from "./components/ui/scroll-area.jsx";
import { cn } from "./lib/utils.js";

const STORAGE_KEY = "routine-grove-state-v1";
const TIMER_STORAGE_KEY = "routine-grove-timer-v1";
const CORRUPT_STORAGE_KEY = "routine-grove-corrupt-backup";
const CURRENT_STATE_VERSION = 3;
const SECOND_MS = 1000;
let storageAccessFailed = false;

const achievements = [
  { id: "first-sprout", title: "First Sprout", target: 1, metric: "completions", description: "Complete this routine once." },
  { id: "in-rhythm", title: "In Rhythm", target: 3, metric: "completions", description: "Complete this routine 3 times." },
  { id: "steady-week", title: "Steady Week", target: 7, metric: "streak", description: "Reach a 7-day streak." },
  { id: "deep-roots", title: "Deep Roots", target: 21, metric: "streak", description: "Reach a 21-day streak." },
  { id: "grove-master", title: "Grove Master", target: 48, metric: "streak", description: "Reach a 48-day streak." },
];

const legacyAchievementLabels = {
  "mam-moi": "first-sprout",
  "vao-guong": "in-rhythm",
  "giu-nhip": "steady-week",
  "ben-bi": "deep-roots",
  "cao-thu": "grove-master",
};

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createStep(name = "Focus Block", minutes = 5, seconds = 0, type = "activity") {
  return { id: makeId(), name, minutes, seconds, type };
}

function createSeedState() {
  const routineId = makeId();
  return {
    version: CURRENT_STATE_VERSION,
    selectedRoutineId: routineId,
    routines: [
      {
        id: routineId,
        name: "Morning Reset",
        createdAt: new Date().toISOString(),
        steps: [
          createStep("Breathe", 4, 0, "activity"),
          createStep("Rest", 0, 45, "rest"),
          createStep("Stretch", 6, 0, "activity"),
          createStep("Plan the day", 5, 0, "activity"),
        ],
      },
    ],
    streaks: {},
    completions: [],
    unlockedAchievements: {},
    stats: { completedRoutines: 0 },
    garden: [],
    xp: 0,
  };
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    storageAccessFailed = true;
    console.error(`Unable to read ${key}`, error);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    storageAccessFailed = true;
    console.error(`Unable to save ${key}`, error);
    return false;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    storageAccessFailed = true;
    console.error(`Unable to remove ${key}`, error);
  }
}

function durationSeconds(step) {
  return Math.max(1, Math.round((Number(step.minutes) || 0) * 60 + (Number(step.seconds) || 0)));
}

function rawDurationSeconds(step) {
  return Math.round((Number(step.minutes) || 0) * 60 + (Number(step.seconds) || 0));
}

function routineDuration(routine) {
  return routine?.steps?.reduce((sum, step) => sum + durationSeconds(step), 0) || 0;
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

function migrateState(parsed) {
  const seed = createSeedState();
  const state = {
    ...seed,
    ...parsed,
    version: CURRENT_STATE_VERSION,
    routines: Array.isArray(parsed.routines) ? parsed.routines : seed.routines,
    streaks: parsed.streaks && typeof parsed.streaks === "object" ? parsed.streaks : {},
    completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    unlockedAchievements: parsed.unlockedAchievements && typeof parsed.unlockedAchievements === "object" ? parsed.unlockedAchievements : {},
    garden: Array.isArray(parsed.garden) ? parsed.garden : [],
    stats: { completedRoutines: Number(parsed.stats?.completedRoutines) || 0 },
    xp: Number(parsed.xp) || 0,
  };
  state.routines = state.routines.map((routine) => ({
    ...routine,
    steps: Array.isArray(routine.steps)
      ? routine.steps.map((step) => ({
          id: step.id || makeId(),
          name: step.name || "Untitled Step",
          minutes: Math.max(0, Number(step.minutes) || 0),
          seconds: Math.min(59, Math.max(0, Number(step.seconds) || 0)),
          type: ["activity", "rest", "meditation", "yoga", "study", "custom"].includes(step.type) ? step.type : "activity",
        }))
      : [],
  }));
  if (!state.routines.find((routine) => routine.id === state.selectedRoutineId)) {
    state.selectedRoutineId = state.routines[0]?.id || null;
  }

  Object.entries(state.unlockedAchievements).forEach(([routineId, unlocked]) => {
    Object.entries(legacyAchievementLabels).forEach(([oldId, newId]) => {
      if (unlocked?.[oldId] && !unlocked[newId]) unlocked[newId] = unlocked[oldId];
    });
    state.unlockedAchievements[routineId] = unlocked;
  });

  return state;
}

function loadState() {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return createSeedState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.version || !Array.isArray(parsed.routines)) return createSeedState();
    return migrateState(parsed);
  } catch {
    safeSetItem(CORRUPT_STORAGE_KEY, raw);
    return createSeedState();
  }
}

function createIdleTimer(routineId) {
  return {
    status: "idle",
    routineId,
    stepIndex: 0,
    elapsedInStep: 0,
    elapsedRoutine: 0,
    lastTickAt: null,
  };
}

function readTimerState(routineId) {
  try {
    const parsed = JSON.parse(safeGetItem(TIMER_STORAGE_KEY) || "null");
    if (!parsed || parsed.routineId !== routineId) return createIdleTimer(routineId);
    return {
      ...createIdleTimer(routineId),
      ...parsed,
      status: ["idle", "paused", "running"].includes(parsed.status) ? parsed.status : "idle",
    };
  } catch {
    safeRemoveItem(TIMER_STORAGE_KEY);
    return createIdleTimer(routineId);
  }
}

function weeklyCounts(completions, routineId) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const count = completions.filter((item) => item.completedAt?.slice(0, 10) === key && (!routineId || item.routineId === routineId)).length;
    return { key, count, label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3) };
  });
}

function normalizeTimerByRoutineElapsed(current, routine) {
  const total = routineDuration(routine);
  if (!routine?.steps.length) return { timer: createIdleTimer(routine?.id), completed: false };
  if (current.elapsedRoutine >= total) {
    const lastStep = routine.steps[routine.steps.length - 1];
    return {
      timer: {
        ...current,
        status: "idle",
        stepIndex: routine.steps.length - 1,
        elapsedRoutine: total,
        elapsedInStep: durationSeconds(lastStep),
        lastTickAt: null,
      },
      completed: true,
    };
  }

  let remaining = Math.max(0, current.elapsedRoutine);
  let stepIndex = 0;
  while (stepIndex < routine.steps.length) {
    const stepDuration = durationSeconds(routine.steps[stepIndex]);
    if (remaining < stepDuration) break;
    remaining -= stepDuration;
    stepIndex += 1;
  }

  return {
    timer: {
      ...current,
      stepIndex,
      elapsedInStep: remaining,
      lastTickAt: current.status === "running" ? Date.now() : null,
    },
    completed: false,
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const activeRoutine = useMemo(
    () => state.routines.find((routine) => routine.id === state.selectedRoutineId) || state.routines[0] || null,
    [state.routines, state.selectedRoutineId],
  );
  const [timer, setTimer] = useState(() => readTimerState(activeRoutine?.id));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState("");
  const [storageWarning, setStorageWarning] = useState(storageAccessFailed);
  const [activeMobileView, setActiveMobileView] = useState("timer");
  const tickRef = useRef(null);

  const step = activeRoutine?.steps[timer.stepIndex] || null;
  const nextStep = activeRoutine?.steps[timer.stepIndex + 1] || null;
  const stepTotal = step ? durationSeconds(step) : 1;
  const totalDuration = routineDuration(activeRoutine);
  const remaining = step ? Math.max(0, stepTotal - timer.elapsedInStep) : 0;
  const stepPct = Math.min(100, Math.round((timer.elapsedInStep / stepTotal) * 100));
  const routinePct = Math.min(100, Math.round((timer.elapsedRoutine / Math.max(1, totalDuration)) * 100));
  const level = levelForXp(state.xp);
  const routineCompletions = state.completions.filter((item) => item.routineId === activeRoutine?.id).length;
  const streak = activeRoutine ? state.streaks[activeRoutine.id] || { current: 0, best: 0 } : { current: 0, best: 0 };
  const latestCompletion = [...state.completions].reverse().find((item) => item.routineId === activeRoutine?.id);
  const week = weeklyCounts(state.completions, activeRoutine?.id);
  const maxWeek = Math.max(1, ...week.map((day) => day.count));
  const history = [...state.completions].filter((item) => item.routineId === activeRoutine?.id).reverse().slice(0, 5);

  useEffect(() => {
    if (!safeSetItem(STORAGE_KEY, JSON.stringify(state))) setStorageWarning(true);
  }, [state]);

  useEffect(() => {
    if (timer.status === "idle") safeRemoveItem(TIMER_STORAGE_KEY);
    else if (!safeSetItem(TIMER_STORAGE_KEY, JSON.stringify(timer))) setStorageWarning(true);
  }, [timer]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (timer.status !== "running") {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return undefined;
    }
    tickRef.current = window.setInterval(() => {
      setTimer((current) => {
        const routine = state.routines.find((item) => item.id === current.routineId) || activeRoutine;
        const currentStep = routine?.steps[current.stepIndex];
        if (!routine || !currentStep) return createIdleTimer(activeRoutine?.id);
        const now = Date.now();
        const delta = Math.max(1, Math.floor((now - (current.lastTickAt || now)) / SECOND_MS));
        const updated = {
          ...current,
          lastTickAt: now,
          elapsedInStep: current.elapsedInStep + delta,
          elapsedRoutine: current.elapsedRoutine + delta,
        };
        if (updated.elapsedInStep >= durationSeconds(currentStep)) {
          const normalized = normalizeTimerByRoutineElapsed(updated, routine);
          if (normalized.completed) window.setTimeout(() => completeRoutine(routine), 0);
          else if (normalized.timer.stepIndex !== current.stepIndex) setToast(`Next: ${routine.steps[normalized.timer.stepIndex].name}`);
          return normalized.timer;
        }
        return updated;
      });
    }, SECOND_MS);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  // Timer interval intentionally reads the current routine snapshot through setTimer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoutine, state.routines, timer.status]);

  useEffect(() => {
    if (!activeRoutine || timer.routineId === activeRoutine.id) return;
    setTimer(readTimerState(activeRoutine.id));
  }, [activeRoutine, timer.routineId]);

  function advanceTimerStep(current, routine) {
    if (current.stepIndex >= routine.steps.length - 1) {
      window.setTimeout(() => completeRoutine(routine), 0);
      return {
        ...current,
        status: "idle",
        elapsedRoutine: routineDuration(routine),
        elapsedInStep: durationSeconds(routine.steps[routine.steps.length - 1]),
      };
    }
    const next = { ...current, stepIndex: current.stepIndex + 1, elapsedInStep: 0, lastTickAt: Date.now() };
    setToast(`Next: ${routine.steps[next.stepIndex].name}`);
    return next;
  }

  function completeRoutine(routine = activeRoutine) {
    if (!routine?.steps.length) return;
    const today = dateKey();
    const yesterday = previousDateKey(today);
    setState((current) => {
      const currentStreak = current.streaks[routine.id] || { current: 0, best: 0, lastCompletedAt: null };
      let nextCurrent = 1;
      if (currentStreak.lastCompletedAt === today) nextCurrent = Math.max(1, currentStreak.current);
      else if (currentStreak.lastCompletedAt === yesterday) nextCurrent = currentStreak.current + 1;
      const nextStreak = { current: nextCurrent, best: Math.max(currentStreak.best || 0, nextCurrent), lastCompletedAt: today };
      const xp = 10 + Math.max(1, Math.ceil(routineDuration(routine) / 60)) * 5 + (nextCurrent % 7 === 0 ? 50 : 0);
      const completion = { id: makeId(), routineId: routine.id, routineName: routine.name, completedAt: new Date().toISOString(), xp };
      const unlocked = { ...(current.unlockedAchievements[routine.id] || {}) };
      const completions = current.completions.filter((item) => item.routineId === routine.id).length + 1;
      achievements.forEach((achievement) => {
        const value = achievement.metric === "streak" ? nextStreak.current : completions;
        if (value >= achievement.target && !unlocked[achievement.id]) unlocked[achievement.id] = new Date().toISOString();
      });
      return {
        ...current,
        xp: current.xp + xp,
        streaks: { ...current.streaks, [routine.id]: nextStreak },
        completions: [...current.completions, completion],
        unlockedAchievements: { ...current.unlockedAchievements, [routine.id]: unlocked },
        stats: { completedRoutines: current.stats.completedRoutines + 1 },
        garden: [...current.garden, { routineName: routine.name, plantedAt: completion.completedAt, symbol: routine.steps[0]?.type || "activity" }],
      };
    });
    setTimer(createIdleTimer(routine.id));
    setToast(`Routine complete: reward earned`);
  }

  function startPauseTimer() {
    if (!activeRoutine?.steps.length) return;
    if (timer.status === "running") {
      setTimer((current) => ({ ...current, status: "paused", lastTickAt: null }));
      return;
    }
    setTimer((current) => ({ ...current, routineId: activeRoutine.id, status: "running", lastTickAt: Date.now() }));
  }

  function skipStep() {
    if (!activeRoutine || timer.status === "idle") return;
    setTimer((current) => advanceTimerStep(current, activeRoutine));
  }

  function resetTimer() {
    if (timer.status !== "idle" || timer.elapsedRoutine > 0) {
      const confirmed = window.confirm("Reset this timer session? Current progress will be cleared.");
      if (!confirmed) return;
    }
    setTimer(createIdleTimer(activeRoutine?.id));
  }

  function selectRoutine(id) {
    setState((current) => ({ ...current, selectedRoutineId: id }));
    setTimer(readTimerState(id));
    setActiveMobileView("timer");
  }

  function duplicateRoutine(routineId) {
    setState((current) => {
      const source = current.routines.find((routine) => routine.id === routineId);
      if (!source) return current;
      const duplicate = {
        ...source,
        id: makeId(),
        name: `${source.name} Copy`,
        createdAt: new Date().toISOString(),
        steps: source.steps.map((step) => ({ ...step, id: makeId() })),
      };
      return { ...current, selectedRoutineId: duplicate.id, routines: [...current.routines, duplicate] };
    });
    setToast("Routine duplicated.");
    setActiveMobileView("timer");
  }

  function openEditor(routine = null) {
    setEditingId(routine?.id || null);
    setDraft({
      name: routine?.name || "New Routine",
      steps: (routine?.steps || [createStep("Focus Block", 5, 0, "activity")]).map((item) => ({ ...item })),
    });
    setEditorOpen(true);
  }

  function updateDraftStep(index, patch) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function moveDraftStep(index, direction) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });
  }

  function saveDraft(event) {
    event.preventDefault();
    const steps = draft.steps
      .map((item) => ({
        ...item,
        name: item.name.trim() || "Untitled Step",
        minutes: Math.max(0, Number(item.minutes) || 0),
        seconds: Math.min(59, Math.max(0, Number(item.seconds) || 0)),
      }))
      .filter((item) => rawDurationSeconds(item) > 0);
    if (!steps.length) {
      setToast("A routine needs at least one timed step.");
      return;
    }
    setState((current) => {
      if (editingId) {
        return {
          ...current,
          routines: current.routines.map((routine) => (routine.id === editingId ? { ...routine, name: draft.name.trim() || "Untitled Routine", steps } : routine)),
        };
      }
      const routine = { id: makeId(), name: draft.name.trim() || "Untitled Routine", createdAt: new Date().toISOString(), steps };
      return { ...current, selectedRoutineId: routine.id, routines: [...current.routines, routine] };
    });
    setEditorOpen(false);
    setToast("Routine saved.");
  }

  function deleteRoutine() {
    if (!editingId) return;
    const routine = state.routines.find((item) => item.id === editingId);
    if (!routine || !window.confirm(`Delete "${routine.name}"? Completion history will stay available.`)) return;
    setState((current) => {
      const routines = current.routines.filter((item) => item.id !== editingId);
      const nextSelected = current.selectedRoutineId === editingId ? routines[0]?.id || null : current.selectedRoutineId;
      const streaks = { ...current.streaks };
      delete streaks[editingId];
      return { ...current, routines, selectedRoutineId: nextSelected, streaks };
    });
    setEditorOpen(false);
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <GlobalNav onNew={() => openEditor()} />
      {storageWarning ? (
        <div className="sticky top-[96px] z-30 border-y border-primary/20 bg-[#f5f5f7] px-4 py-3 text-center text-sm text-[#333]" role="alert">
          Local storage is unavailable, so changes may not survive a refresh. Export or keep this tab open until storage is restored.
        </div>
      ) : null}
      <main className="pb-32 sm:pb-0">
        <MobileViewPane id="timer" active={activeMobileView === "timer"}>
          <TimerHero
            routine={activeRoutine}
            step={step}
            nextStep={nextStep}
            timer={timer}
            remaining={remaining}
            stepPct={stepPct}
            routinePct={routinePct}
            startPauseTimer={startPauseTimer}
            skipStep={skipStep}
            resetTimer={resetTimer}
            onEdit={() => openEditor(activeRoutine)}
          />
        </MobileViewPane>
        <MobileViewPane id="routines" active={activeMobileView === "routines"}>
          <RoutineGallery
            routines={state.routines}
            selectedId={activeRoutine?.id}
            selectRoutine={selectRoutine}
            duplicateRoutine={duplicateRoutine}
            openEditor={openEditor}
            streaks={state.streaks}
          />
        </MobileViewPane>
        <MobileViewPane id="progress" active={activeMobileView === "progress"}>
          <ProgressSurface
            state={state}
            activeRoutine={activeRoutine}
            level={level}
            routineCompletions={routineCompletions}
            streak={streak}
            latestCompletion={latestCompletion}
            week={week}
            maxWeek={maxWeek}
            history={history}
          />
        </MobileViewPane>
        <MobileViewPane id="awards" active={activeMobileView === "awards"}>
          <AchievementSurface state={state} activeRoutine={activeRoutine} routineCompletions={routineCompletions} streak={streak} />
        </MobileViewPane>
      </main>
      <MobileTabBar active={activeMobileView} setActive={setActiveMobileView} />
      <EditorDialog
        open={editorOpen}
        setOpen={setEditorOpen}
        editingId={editingId}
        draft={draft}
        setDraft={setDraft}
        updateDraftStep={updateDraftStep}
        moveDraftStep={moveDraftStep}
        saveDraft={saveDraft}
        deleteRoutine={deleteRoutine}
      />
      <div
        className={cn(
          "fixed bottom-[160px] right-4 z-50 max-w-[min(420px,calc(100vw-32px))] rounded-sm bg-[#1d1d1f] px-5 py-3 text-sm text-white transition sm:bottom-5 sm:right-5 sm:max-w-[min(420px,calc(100vw-40px))]",
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}

function MobileViewPane({ id, active, children }) {
  return (
    <div data-mobile-pane={id} data-active={active ? "true" : "false"} className={cn(active ? "block animate-mobile-pane" : "hidden", "sm:block sm:animate-none")}>
      {children}
    </div>
  );
}

function MobileTabBar({ active, setActive }) {
  const tabs = [
    { id: "timer", label: "Timer", icon: Play },
    { id: "routines", label: "Routines", icon: ListChecks },
    { id: "progress", label: "Progress", icon: BarChart3 },
    { id: "awards", label: "Awards", icon: Trophy },
  ];

  return (
    <nav className="frosted fixed inset-x-0 bottom-0 z-40 border-t border-black/10 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 sm:hidden" aria-label="Mobile app sections">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "grid min-h-[52px] place-items-center rounded-md px-1 text-[11px] font-medium tracking-[-0.08px] transition active:scale-95",
                selected ? "bg-primary text-white" : "text-[#333] hover:bg-black/[0.04]",
              )}
              aria-current={selected ? "page" : undefined}
              onClick={() => setActive(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function GlobalNav({ onNew }) {
  return (
    <>
      <nav className="sticky top-0 z-40 h-11 bg-black text-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 text-xs tracking-[-0.12px]">
          <span className="font-semibold">Routine Grove</span>
          <div className="hidden items-center gap-8 opacity-90 sm:flex">
            <a href="#timer">Timer</a>
            <a href="#routines">Routines</a>
            <a href="#progress">Progress</a>
          </div>
          <button className="text-xs text-white/90" onClick={onNew} type="button">
            New
          </button>
        </div>
      </nav>
      <div className="frosted sticky top-11 z-30 border-b border-black/10">
        <div className="mx-auto flex h-[52px] max-w-[1440px] items-center justify-between px-5">
          <span className="text-[21px] font-semibold tracking-[0.231px]">Routine Timer</span>
          <Button size="sm" onClick={onNew}>
            Add routine
          </Button>
        </div>
      </div>
    </>
  );
}

function TimerHero({ routine, step, nextStep, timer, remaining, stepPct, routinePct, startPauseTimer, skipStep, resetTimer, onEdit }) {
  return (
    <section id="timer" className="tile flex items-center bg-[#f5f5f7]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="text-center lg:text-left">
          <Badge variant="outline" className="mb-5 bg-white/80">
            {step?.type || "Routine"}
          </Badge>
          <h1 className="apple-tight text-[44px] font-semibold leading-[1.07] sm:text-[56px]">{routine?.name || "No routine selected"}</h1>
          <p className="mx-auto mt-4 max-w-xl text-[21px] leading-[1.35] tracking-[-0.2px] text-[#333] lg:mx-0">
            {step?.name || "Create a routine, then let the timer carry the session."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button onClick={startPauseTimer} disabled={!routine?.steps.length}>
              {timer.status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
            </Button>
            <Button variant="outline" onClick={skipStep} disabled={!routine?.steps.length || timer.status === "idle"}>
              <Scissors className="h-4 w-4" />
              Skip
            </Button>
            <Button variant="secondary" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="ghost" onClick={onEdit}>
              Edit routine
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[360px] sm:max-w-[500px]">
          <div className="grid aspect-square place-items-center rounded-full bg-[conic-gradient(#0066cc_var(--pct),#e6e6e8_0deg)] p-4 shadow-product" style={{ "--pct": `${stepPct * 3.6}deg` }}>
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
              <div>
                <span className="block text-[54px] font-semibold leading-none tracking-[-1px] sm:text-[82px]">{formatDuration(remaining)}</span>
                <p className="mt-3 text-[17px] text-muted-foreground">{timer.status === "running" ? "In progress" : timer.status === "paused" ? "Paused" : "Ready"}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <Progress value={stepPct} aria-label={`Current step progress: ${Math.round(stepPct)} percent`} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Next: {nextStep?.name || "Finish line"}</span>
              <strong className="text-foreground">{routinePct}% routine</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="frosted fixed inset-x-0 bottom-[76px] z-30 border-t border-black/10 p-3 sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_auto] gap-2">
          <Button onClick={startPauseTimer} disabled={!routine?.steps.length}>{timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}</Button>
          <Button variant="outline" size="icon" onClick={skipStep} disabled={!routine?.steps.length || timer.status === "idle"} aria-label="Skip step"><Scissors className="h-4 w-4" /></Button>
          <Button variant="secondary" size="icon" onClick={resetTimer} aria-label="Reset timer"><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>
    </section>
  );
}

function RoutineGallery({ routines, selectedId, selectRoutine, duplicateRoutine, openEditor, streaks }) {
  return (
    <section id="routines" className="tile-compact bg-[#272729] text-white">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="apple-tight text-[40px] font-semibold leading-tight">Pick the next session.</h2>
            <p className="mt-2 text-[17px] text-[#cccccc]">The routine list is the product shelf: quiet, direct, and ready to run.</p>
          </div>
          <Button onClick={() => openEditor()}><Plus className="h-4 w-4" />New routine</Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className={cn(
                "rounded-lg border p-6 text-left transition active:scale-[0.98]",
                selectedId === routine.id ? "border-primary bg-white text-[#1d1d1f]" : "border-white/10 bg-[#2a2a2c] text-white",
              )}
            >
              <button className="w-full text-left" onClick={() => selectRoutine(routine.id)} type="button">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[21px] font-semibold tracking-[-0.2px]">{routine.name}</h3>
                  {selectedId === routine.id ? <Check className="h-5 w-5 text-primary" /> : null}
                </div>
                <p className={cn("mt-4 text-sm", selectedId === routine.id ? "text-[#6e6e73]" : "text-[#cccccc]")}>
                  {routine.steps.length} steps - {formatMinutes(routineDuration(routine))} - {streaks[routine.id]?.current || 0}d streak
                </p>
              </button>
              <Button
                className="mt-5 w-full"
                variant={selectedId === routine.id ? "outline" : "secondary"}
                size="sm"
                type="button"
                onClick={() => duplicateRoutine(routine.id)}
              >
                Duplicate
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgressSurface({ state, activeRoutine, level, routineCompletions, streak, latestCompletion, week, maxWeek, history }) {
  return (
    <section id="progress" className="tile-compact bg-white">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 text-center">
          <h2 className="apple-tight text-[40px] font-semibold leading-tight">Progress, without the noise.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[17px] leading-[1.47] tracking-[-0.2px] text-[#333]">XP, streak, history, and weekly pulse stay close to the timer so the reward loop is always visible.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Level {level.level}</CardTitle>
              <CardDescription>{state.xp} XP banked</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={Math.round((level.remaining / level.threshold) * 100)} aria-label={`Level progress: ${Math.round((level.remaining / level.threshold) * 100)} percent`} />
              <p className="mt-3 text-sm text-muted-foreground">{level.threshold - level.remaining} XP to level {level.level + 1}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> 7-Day Pulse</CardTitle>
              <CardDescription>{activeRoutine?.name || "Routine"} completion rhythm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid h-40 grid-cols-7 items-end gap-2">
                {week.map((day) => (
                  <div className="grid h-full items-end gap-1 text-center text-xs text-muted-foreground" key={day.key}>
                    <div className="mx-auto w-full rounded-t-md bg-primary" style={{ height: `${Math.max(10, (day.count / maxWeek) * 100)}%` }} />
                    <strong className="text-foreground">{day.count}</strong>
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Reward Loop</CardTitle>
              <CardDescription>{routineCompletions} completions for this routine</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Metric label="Current streak" value={`${streak.current || 0}d`} />
              <Metric label="Best streak" value={`${streak.best || 0}d`} />
              <Metric label="Last reward" value={latestCompletion ? `+${latestCompletion.xp} XP` : "Ready"} />
            </CardContent>
          </Card>
        </div>
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /> Completion History</CardTitle>
            <CardDescription>The last five sessions for the selected routine.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {history.length ? history.map((item) => (
              <div className="rounded-md border border-border bg-[#fafafc] p-4" key={item.id}>
                <strong className="block text-sm">{item.routineName}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <Badge className="mt-3">+{item.xp} XP</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">Run this routine to create the first completion log.</p>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function AchievementSurface({ state, activeRoutine, routineCompletions, streak }) {
  const unlocked = state.unlockedAchievements[activeRoutine?.id] || {};
  return (
    <section className="tile-compact bg-[#f5f5f7] pb-28 sm:pb-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="apple-tight text-[40px] font-semibold leading-tight">Achievements as quiet signals.</h2>
            <p className="mt-2 text-[17px] text-[#333]">Clear unlock states, readable progress, no arcade clutter.</p>
          </div>
          <Badge variant="outline" className="hidden bg-white sm:inline-flex">{Object.keys(unlocked).length}/{achievements.length} unlocked</Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {achievements.map((achievement) => {
            const value = achievement.metric === "streak" ? streak.current || 0 : routineCompletions;
            const pct = Math.min(100, Math.round((value / achievement.target) * 100));
            return (
              <Card key={achievement.id} className={cn(unlocked[achievement.id] ? "border-primary" : "opacity-75")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{achievement.title}</span>
                    {unlocked[achievement.id] ? <Leaf className="h-5 w-5 text-primary" /> : null}
                  </CardTitle>
                  <CardDescription>{achievement.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={pct} aria-label={`${achievement.title} progress: ${pct} percent`} />
                  <p className="mt-3 text-sm text-muted-foreground">{Math.min(value, achievement.target)}/{achievement.target}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[#fafafc] px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EditorDialog({ open, setOpen, editingId, draft, setDraft, updateDraftStep, moveDraftStep, saveDraft, deleteRoutine }) {
  if (!draft) return null;
  const total = draft.steps.reduce((sum, step) => sum + durationSeconds(step), 0);
  return (
    <Dialog open={open} onOpenChange={setOpen} title={editingId ? "Edit Routine" : "New Routine"} description="Routine editor">
      <DialogContent>
        <ScrollArea className="max-h-[calc(100vh-56px)] pr-1">
        <form onSubmit={saveDraft}>
          <DialogHeader>
            <div>
              <DialogTitle>{editingId ? "Edit Routine" : "New Routine"}</DialogTitle>
              <DialogDescription>{draft.steps.length} steps - {formatDuration(total)} total</DialogDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </DialogHeader>
          <label className="grid gap-2 text-sm text-muted-foreground">
            Routine name
            <input
              className="min-h-11 rounded-md border border-input px-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              value={draft.name}
              maxLength={48}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <div className="mt-5 grid gap-3">
            {draft.steps.map((step, index) => (
              <div className="grid gap-2 rounded-md border border-border bg-[#fafafc] p-3 lg:grid-cols-[1fr_82px_82px_132px_112px_112px_96px]" key={step.id}>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Step
                  <input className="min-h-11 rounded-sm border border-input px-3 text-base text-foreground lg:text-sm" value={step.name} onChange={(event) => updateDraftStep(index, { name: event.target.value })} aria-label="Step name" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Min
                  <input className="min-h-11 rounded-sm border border-input px-3 text-base text-foreground lg:text-sm" type="number" min="0" max="180" value={step.minutes} onChange={(event) => updateDraftStep(index, { minutes: event.target.value })} aria-label="Minutes" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Sec
                  <input className="min-h-11 rounded-sm border border-input px-3 text-base text-foreground lg:text-sm" type="number" min="0" max="59" step="5" value={step.seconds} onChange={(event) => updateDraftStep(index, { seconds: event.target.value })} aria-label="Seconds" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Type
                  <select className="min-h-11 rounded-sm border border-input px-3 text-base text-foreground lg:text-sm" value={step.type} onChange={(event) => updateDraftStep(index, { type: event.target.value })} aria-label="Step type">
                    {["activity", "rest", "meditation", "yoga", "study", "custom"].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" size="icon" onClick={() => moveDraftStep(index, -1)} aria-label="Move step up"><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="secondary" size="icon" onClick={() => moveDraftStep(index, 1)} aria-label="Move step down"><ArrowDown className="h-4 w-4" /></Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft((current) => ({
                    ...current,
                    steps: current.steps.flatMap((item, itemIndex) => (
                      itemIndex === index ? [item, { ...item, id: makeId(), name: `${item.name || "Step"} Copy` }] : [item]
                    )),
                  }))}
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.filter((_, itemIndex) => itemIndex !== index) : current.steps }))}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, createStep()] }))}>
            <Plus className="h-4 w-4" />
            Add step
          </Button>
          <DialogFooter>
            {editingId ? <Button type="button" variant="secondary" onClick={deleteRoutine}>Delete routine</Button> : <span />}
            <div className="grid gap-2 sm:flex">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save routine</Button>
            </div>
          </DialogFooter>
        </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default App;
