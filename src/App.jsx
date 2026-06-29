import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Clock3,
  Flame,
  Leaf,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
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
let timerAudioContext = null;

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

function createDefaultRoutineDraft() {
  return {
    name: "New Routine",
    steps: [
      createStep("Prepare", 0, 5, "prepare"),
      createStep("Work", 1, 0, "activity"),
      createStep("Rest", 0, 30, "rest"),
      createStep("Finish", 0, 3, "finish"),
    ],
  };
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

function formatDurationInput(secondsValue) {
  const safeSeconds = Math.max(0, Math.round(Number(secondsValue) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function parseDurationInput(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return { minutes: 0, seconds: 0 };

  if (text.endsWith("s")) {
    const secondsOnly = Number.parseInt(text, 10);
    const total = Number.isFinite(secondsOnly) ? Math.max(0, secondsOnly) : 0;
    return { minutes: Math.floor(total / 60), seconds: total % 60 };
  }

  if (text.includes(":")) {
    const [minutePart = "0", secondPart = "0"] = text.split(":");
    const minutes = Math.max(0, Number.parseInt(minutePart, 10) || 0);
    const seconds = Math.min(59, Math.max(0, Number.parseInt(secondPart, 10) || 0));
    return { minutes, seconds };
  }

  const minutes = Math.max(0, Number.parseInt(text, 10) || 0);
  return { minutes, seconds: 0 };
}

function secondsToStepPatch(totalSeconds) {
  const safeSeconds = Math.max(0, Math.min(180 * 60 + 59, Math.round(Number(totalSeconds) || 0)));
  return { minutes: Math.floor(safeSeconds / 60), seconds: safeSeconds % 60 };
}

function getTimerAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  timerAudioContext ||= new AudioContextCtor();
  return timerAudioContext;
}

function unlockTimerAudio() {
  const context = getTimerAudioContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
}

function playTimerChime(kind = "step") {
  const context = getTimerAudioContext();
  if (!context) return;
  if (context.state === "suspended") context.resume().catch(() => {});

  const now = context.currentTime;
  const notes = kind === "complete"
    ? [
        { frequency: 660, start: 0, duration: 0.13 },
        { frequency: 880, start: 0.15, duration: 0.18 },
      ]
    : [{ frequency: 740, start: 0, duration: 0.16 }];

  notes.forEach(({ frequency, start, duration }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + start);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.03);
  });

  if (kind === "step") navigator.vibrate?.(80);
  else navigator.vibrate?.([80, 40, 120]);
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
          if (normalized.completed) {
            window.setTimeout(() => completeRoutine(routine, { chime: true }), 0);
          } else if (normalized.timer.stepIndex !== current.stepIndex) {
            playTimerChime("step");
            setToast(`Next: ${routine.steps[normalized.timer.stepIndex].name}`);
          }
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
      window.setTimeout(() => completeRoutine(routine, { chime: false }), 0);
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

  function completeRoutine(routine = activeRoutine, options = {}) {
    return completeRoutineWithOptions(routine, options);
  }

  function completeRoutineWithOptions(routine = activeRoutine, options = {}) {
    if (!routine?.steps.length) return;
    if (options.chime) playTimerChime("complete");
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
    unlockTimerAudio();
    setTimer((current) => ({ ...current, routineId: activeRoutine.id, status: "running", lastTickAt: Date.now() }));
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

  function selectAdjacentRoutine(direction) {
    const routines = state.routines;
    if (routines.length < 2) return;
    const currentIndex = Math.max(0, routines.findIndex((routine) => routine.id === activeRoutine?.id));
    const nextIndex = (currentIndex + direction + routines.length) % routines.length;
    selectRoutine(routines[nextIndex].id);
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
    setDraft(routine ? {
      name: routine.name || "Untitled Routine",
      steps: routine.steps.map((item) => ({ ...item })),
    } : createDefaultRoutineDraft());
    setEditorOpen(true);
  }

  function updateDraftStep(index, patch) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
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
    <div className="min-h-screen bg-background text-foreground">
      {storageWarning ? (
        <div className="sticky top-0 z-30 border-y border-primary/20 bg-surface-muted px-4 py-3 text-center text-sm text-foreground" role="alert">
          Local storage is unavailable, so changes may not survive a refresh. Export or keep this tab open until storage is restored.
        </div>
      ) : null}
      <AppShell
        state={state}
        activeRoutine={activeRoutine}
        step={step}
        nextStep={nextStep}
        timer={timer}
        remaining={remaining}
        stepPct={stepPct}
        routinePct={routinePct}
        startPauseTimer={startPauseTimer}
        resetTimer={resetTimer}
        previousRoutine={() => selectAdjacentRoutine(-1)}
        nextRoutine={() => selectAdjacentRoutine(1)}
        openEditor={openEditor}
        selectRoutine={selectRoutine}
        duplicateRoutine={duplicateRoutine}
        level={level}
        routineCompletions={routineCompletions}
        streak={streak}
        latestCompletion={latestCompletion}
        week={week}
        maxWeek={maxWeek}
        history={history}
      />
      <main className="mobile-app-main sm:hidden">
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
            resetTimer={resetTimer}
            previousRoutine={() => selectAdjacentRoutine(-1)}
            nextRoutine={() => selectAdjacentRoutine(1)}
            onEdit={() => openEditor(activeRoutine)}
            streak={streak}
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
      <MobileTabBar active={activeMobileView} setActive={setActiveMobileView} onNew={() => openEditor()} />
      <EditorDialog
        open={editorOpen}
        setOpen={setEditorOpen}
        editingId={editingId}
        draft={draft}
        setDraft={setDraft}
        updateDraftStep={updateDraftStep}
        saveDraft={saveDraft}
        deleteRoutine={deleteRoutine}
      />
      <div
        className={cn(
          "fixed bottom-[160px] right-4 z-50 max-w-[min(420px,calc(100vw-32px))] rounded-sm bg-[#1d1d1f] px-5 py-3 text-sm text-white transition sm:bottom-5 sm:right-5 sm:max-w-[min(420px,calc(100vw-40px))]",
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast}
      </div>
    </div>
  );
}

function AppShell({
  state,
  activeRoutine,
  step,
  nextStep,
  timer,
  remaining,
  stepPct,
  routinePct,
  startPauseTimer,
  resetTimer,
  previousRoutine,
  nextRoutine,
  openEditor,
  selectRoutine,
  duplicateRoutine,
  level,
  routineCompletions,
  streak,
  latestCompletion,
  week,
  maxWeek,
  history,
}) {
  return (
    <main className="routine-cockpit-shell hidden sm:grid">
      <RoutineRail
        routines={state.routines}
        selectedId={activeRoutine?.id}
        selectRoutine={selectRoutine}
        duplicateRoutine={duplicateRoutine}
        openEditor={openEditor}
        streaks={state.streaks}
      />
      <TimerHero
        compact
        routine={activeRoutine}
        step={step}
        nextStep={nextStep}
        timer={timer}
        remaining={remaining}
        stepPct={stepPct}
        routinePct={routinePct}
        startPauseTimer={startPauseTimer}
        resetTimer={resetTimer}
        previousRoutine={previousRoutine}
        nextRoutine={nextRoutine}
        onEdit={() => openEditor(activeRoutine)}
        streak={streak}
      />
      <InsightRail
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
    </main>
  );
}

function RoutineRail({ routines, selectedId, selectRoutine, duplicateRoutine, openEditor, streaks }) {
  return (
    <aside id="routines" className="cockpit-rail border-r border-border bg-background">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Library</p>
          <h2 className="mt-1 text-[22px] font-semibold">Playlists</h2>
        </div>
        <Button size="icon" onClick={() => openEditor()} aria-label="Create routine">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-6 grid gap-3">
        {routines.map((routine) => {
          const selected = selectedId === routine.id;
          return (
            <div
              className={cn(
                "rounded-lg border bg-surface p-3 transition",
                selected ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]" : "border-border hover:border-primary/30",
              )}
              key={routine.id}
            >
              <button className="flex w-full gap-3 text-left" onClick={() => selectRoutine(routine.id)} type="button">
                <span className="routine-album-art h-12 w-12 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <strong className="min-w-0 text-[15px] leading-tight">{routine.name}</strong>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {routine.steps.length} tracks - {formatMinutes(routineDuration(routine))} - {streaks[routine.id]?.current || 0}d streak
                  </span>
                </span>
              </button>
              <Button className="mt-3 w-full" variant="secondary" size="sm" type="button" onClick={() => duplicateRoutine(routine.id)}>
                Duplicate
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function InsightRail({ state, activeRoutine, level, routineCompletions, streak, latestCompletion, week, maxWeek, history }) {
  const unlocked = state.unlockedAchievements[activeRoutine?.id] || {};
  const nextAchievement = achievements.find((achievement) => !unlocked[achievement.id]) || achievements[achievements.length - 1];
  const nextValue = nextAchievement?.metric === "streak" ? streak.current || 0 : routineCompletions;
  const nextPct = nextAchievement ? Math.min(100, Math.round((nextValue / nextAchievement.target) * 100)) : 100;

  return (
    <aside className="cockpit-rail border-l border-border bg-background">
      <section id="progress" aria-labelledby="progress-title">
        <p className="text-xs font-medium uppercase text-muted-foreground">This routine</p>
        <h2 id="progress-title" className="mt-1 text-[22px] font-semibold">Progress for the selected routine</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <FitnessMetricTile icon={Sparkles} label="Level" value={level.level} sub={`${state.xp} XP`} tone="move" />
          <FitnessMetricTile icon={Check} label="Completions" value={routineCompletions} sub={activeRoutine?.name || "Selected"} tone="exercise" />
          <FitnessMetricTile icon={Flame} label="Streak" value={`${streak.current || 0}d`} sub={`Best ${streak.best || 0}d`} tone="stand" />
          <FitnessMetricTile icon={Trophy} label="Last Reward" value={latestCompletion ? `+${latestCompletion.xp}` : "Ready"} sub="XP" tone="award" />
        </div>
      </section>

      <div className="fitness-metric-tile mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold">Level progress</h3>
            <p className="mt-1 text-sm text-muted-foreground">{level.threshold - level.remaining} XP to level {level.level + 1}</p>
          </div>
          <Badge variant="outline">Level {level.level}</Badge>
        </div>
        <Progress className="mt-4" value={Math.round((level.remaining / level.threshold) * 100)} aria-label={`Level progress: ${Math.round((level.remaining / level.threshold) * 100)} percent`} />
      </div>

      <section className="mt-5" aria-label="Weekly pulse">
        <div className="grid h-28 grid-cols-7 items-end gap-1.5">
          {week.map((day) => (
            <div className="grid h-full items-end gap-1 text-center text-[11px] text-muted-foreground" key={day.key}>
              <div className="mx-auto w-full rounded-t bg-primary" style={{ height: `${Math.max(10, (day.count / maxWeek) * 100)}%` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="awards" className="mt-6" aria-labelledby="awards-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="awards-title" className="text-[17px] font-semibold">Awards for this routine</h2>
          <Badge variant="outline">{Object.keys(unlocked).length}/{achievements.length}</Badge>
        </div>
        {nextAchievement ? (
          <div className="mt-3 rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-sm">{nextAchievement.title}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{nextAchievement.description}</p>
              </div>
              {unlocked[nextAchievement.id] ? <Leaf className="h-5 w-5 text-primary" /> : <Trophy className="h-5 w-5 text-muted-foreground" />}
            </div>
            <Progress className="mt-4" value={nextPct} aria-label={`${nextAchievement.title} progress: ${nextPct} percent`} />
            <p className="mt-2 text-xs text-muted-foreground">{Math.min(nextValue, nextAchievement.target)}/{nextAchievement.target}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6" aria-label="Recent completion history">
        <h2 className="text-[17px] font-semibold">Recent sessions</h2>
        <div className="mt-3 grid gap-2">
          {history.length ? history.slice(0, 3).map((item) => (
            <div className="rounded-sm bg-surface-muted p-3" key={item.id}>
              <strong className="block text-sm">{item.routineName}</strong>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">Run this routine to create the first completion log.</p>}
        </div>
      </section>
    </aside>
  );
}

function MobileViewPane({ id, active, children }) {
  return (
    <div data-mobile-pane={id} data-active={active ? "true" : "false"} className={cn(active ? "block animate-mobile-pane" : "hidden", "sm:hidden")}>
      {children}
    </div>
  );
}

function MobileTabBar({ active, setActive, onNew }) {
  const tabs = [
    { id: "timer", label: "Timer", icon: Play },
    { id: "routines", label: "Routines", icon: ListChecks },
    { id: "progress", label: "Progress", icon: BarChart3 },
    { id: "awards", label: "Awards", icon: Trophy },
  ];
  const visibleItems = [tabs[0], tabs[1], { id: "new", label: "New routine", icon: Plus }, tabs[2], tabs[3]];

  return (
    <nav className="frosted fixed inset-x-0 bottom-0 z-40 border-t border-border px-3 pb-[calc(var(--safe-area-bottom)+4px)] pt-1 sm:hidden" aria-label="Mobile app sections">
      <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-1">
        {visibleItems.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          if (tab.id === "new") {
            return (
              <button
                key={tab.id}
                type="button"
                className="mobile-new-routine-button grid h-[60px] w-[60px] -translate-y-[15px] place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(250,45,72,0.38)] transition active:scale-95"
                aria-label="Create routine"
                onClick={onNew}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "mobile-tab-button grid min-h-[42px] place-items-center rounded-md px-1 text-[10px] font-medium tracking-[-0.08px] transition active:scale-95",
                selected ? "is-active bg-primary text-primary-foreground" : "text-foreground hover:bg-surface-muted",
              )}
              aria-current={selected ? "page" : undefined}
              aria-label={`Go to ${tab.label}`}
              onClick={() => setActive(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TimerHero({ compact = false, routine, step, nextStep, timer, remaining, stepPct, routinePct, startPauseTimer, resetTimer, previousRoutine, nextRoutine, onEdit, streak }) {
  const hasRoutine = Boolean(routine?.steps.length);
  const streakPct = Math.min(100, Math.round(((streak?.current || 0) / 7) * 100));
  const sessionFacts = [
    { label: "Steps", value: routine?.steps.length || 0 },
    { label: "Length", value: routine ? formatMinutes(routineDuration(routine)) : "0s" },
    { label: "Streak", value: `${streak?.current || 0}d` },
  ];

  return (
    <section id="timer" className={cn(compact ? "timer-cockpit-card" : "tile flex items-center bg-surface-muted")}>
      <div className={cn("mx-auto grid w-full min-w-0 justify-items-center gap-10 lg:items-center", compact ? "max-w-[760px]" : "max-w-[1180px] lg:grid-cols-[0.92fr_1.08fr] lg:justify-items-stretch")}>
        <div className="hidden text-center sm:block lg:text-left">
          <Badge variant="outline" className="mb-5 bg-surface/80">Now Playing</Badge>
          <h1 className={cn("apple-tight font-semibold leading-[1.07]", compact ? "text-[38px]" : "text-[44px] sm:text-[56px]")}>{routine?.name || "No routine selected"}</h1>
          <p className={cn("mx-auto mt-4 max-w-xl leading-[1.35] tracking-normal text-foreground lg:mx-0", compact ? "text-[18px]" : "text-[21px]")}>
            {step?.name || "Create a routine, then let the timer carry the session."}
          </p>
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-border bg-surface p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.03)] lg:mx-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">Session focus</p>
                <p className="mt-1 text-[17px] font-semibold">{step?.name || "No active step"}</p>
              </div>
              <Badge variant="outline">{timer.status}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {sessionFacts.map((fact) => (
                <div className="rounded-sm bg-surface-muted px-3 py-2" key={fact.label}>
                  <span className="block text-xs text-muted-foreground">{fact.label}</span>
                  <strong className="mt-1 block text-sm">{fact.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={cn("mx-auto w-full max-w-[360px]", compact ? "sm:max-w-[430px]" : "sm:max-w-[500px]")}>
          <NowPlayingArtwork
            routine={routine}
            step={step}
            stepPct={stepPct}
            routinePct={routinePct}
            streakPct={streakPct}
            remaining={remaining}
            compact={compact}
            status={timer.status}
            hasRoutine={hasRoutine}
            onPlayPause={startPauseTimer}
            onPreviousRoutine={previousRoutine}
            onNextRoutine={nextRoutine}
            onReset={resetTimer}
            onEdit={onEdit}
          />
          <MusicMiniPlayer routine={routine} step={step} nextStep={nextStep} status={timer.status} />
        </div>
      </div>
    </section>
  );
}

function NowPlayingArtwork({ routine, step, stepPct, routinePct, streakPct, remaining, compact, status, hasRoutine, onPlayPause, onPreviousRoutine, onNextRoutine, onReset, onEdit }) {
  const isRunning = status === "running";
  const shareText = `${routine?.name || "Routine"} - ${step?.name || "No active step"} - ${formatDuration(remaining)} remaining`;

  async function shareRoutine() {
    if (navigator.share) {
      await navigator.share({ title: routine?.name || "Routine Grove", text: shareText }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(shareText).catch(() => {});
  }

  return (
    <div>
      <div className="relative">
        <div className={cn("routine-album-art grid aspect-square place-items-center p-8 text-center", isRunning && "is-playing")} aria-label={`Now Playing: ${routine?.name || "Routine"}`} role="img">
          <div>
            <span className={cn("timer-figure block font-semibold leading-none text-white", compact ? "text-[72px]" : "text-[54px] sm:text-[82px]")}>{formatDuration(remaining)}</span>
            <p className="mt-3 text-[17px] font-medium text-white/80">{status === "running" ? "Playing" : status === "paused" ? "Paused" : "Ready"}</p>
            <p className="mt-1 text-sm text-white/55">{step?.name || "No active step"}</p>
          </div>
        </div>
        <div className="music-album-actions">
          <button className="music-album-action" type="button" onClick={onEdit} aria-label={routine ? "Edit routine" : "Create routine"}>
            <Pencil className="h-5 w-5" />
          </button>
          <button className="music-album-action" type="button" onClick={shareRoutine} aria-label="Share routine">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <button className="music-reset-button" type="button" onClick={onReset} aria-label="Reset timer">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid gap-2">
        <div className="music-playback-stack">
          <div className="music-playback-controls">
            <button className="music-skip-button" type="button" onClick={onPreviousRoutine} disabled={!hasRoutine} aria-label="Previous routine">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              className={cn("music-playback-button", isRunning && "is-running")}
              type="button"
              onClick={onPlayPause}
              disabled={!hasRoutine}
              aria-label={isRunning ? "Pause routine" : "Start routine"}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
            </button>
            <button className="music-skip-button" type="button" onClick={onNextRoutine} disabled={!hasRoutine} aria-label="Next routine">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
          <div className="music-scrubber" aria-label={`Current step scrubber: ${stepPct} percent`}>
            <span style={{ width: `${stepPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MusicMiniPlayer({ routine, step, nextStep, status }) {
  return (
    <div className="music-mini-player mt-5 flex items-center gap-3 rounded-[16px] p-3">
      <div className="routine-album-art h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{routine?.name || "Routine Grove"}</p>
        <p className="truncate text-xs text-muted-foreground">Up next: {nextStep?.name || step?.name || "Finish line"}</p>
      </div>
      <Badge variant="outline">{status}</Badge>
    </div>
  );
}

function RoutineGallery({ routines, selectedId, selectRoutine, duplicateRoutine, openEditor, streaks }) {
  return (
    <section id="routines" className="tile-compact bg-foreground text-background">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="apple-tight text-[40px] font-semibold leading-tight">Pick the next session.</h2>
            <p className="mt-2 text-[17px] text-background/70">The routine list is the product shelf: quiet, direct, and ready to run.</p>
          </div>
          <Button onClick={() => openEditor()}><Plus className="h-4 w-4" />New routine</Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className={cn(
                "rounded-lg border p-6 text-left transition active:scale-[0.98]",
                selectedId === routine.id ? "border-primary bg-background text-foreground" : "border-background/10 bg-background/10 text-background",
              )}
            >
              <button className="w-full text-left" onClick={() => selectRoutine(routine.id)} type="button">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[21px] font-semibold tracking-[-0.2px]">{routine.name}</h3>
                  {selectedId === routine.id ? <Check className="h-5 w-5 text-primary" /> : null}
                </div>
                <p className={cn("mt-4 text-sm", selectedId === routine.id ? "text-muted-foreground" : "text-background/70")}>
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
    <section id="progress" className="tile-compact bg-background">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 text-center">
          <h2 className="apple-tight text-[40px] font-semibold leading-tight">Progress, without the noise.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[17px] leading-[1.47] tracking-normal text-foreground">XP, streak, history, and weekly pulse stay close to the timer so the reward loop is always visible.</p>
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
              <div className="rounded-sm border border-border bg-surface-muted p-4" key={item.id}>
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
    <section id="awards" className="tile-compact bg-surface-muted pb-28 sm:pb-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="apple-tight text-[40px] font-semibold leading-tight">Achievements as quiet signals.</h2>
            <p className="mt-2 text-[17px] text-foreground">Clear unlock states, readable progress, no arcade clutter.</p>
          </div>
          <Badge variant="outline" className="hidden bg-surface sm:inline-flex">{Object.keys(unlocked).length}/{achievements.length} unlocked</Badge>
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
    <div className="flex items-center justify-between rounded-sm bg-surface-muted px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FitnessMetricTile({ icon: Icon, label, value, sub, tone }) {
  const colors = {
    move: "var(--ring-move)",
    exercise: "var(--ring-exercise)",
    stand: "var(--ring-stand)",
    award: "var(--ring-award)",
  };

  return (
    <div className="fitness-metric-tile">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: colors[tone] }} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <strong className="mt-3 block text-[24px] leading-none">{value}</strong>
      <span className="mt-2 block text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function EditorDialog({ open, setOpen, editingId, draft, setDraft, updateDraftStep, saveDraft, deleteRoutine }) {
  if (!draft) return null;
  const total = draft.steps.reduce((sum, step) => sum + durationSeconds(step), 0);
  const durationPresets = [30, 60, 180, 300, 600];
  return (
    <Dialog open={open} onOpenChange={setOpen} title={editingId ? "Edit Routine" : "New Routine"} description="Routine editor">
      <DialogContent className="max-w-full overflow-hidden p-4 sm:p-6">
        <ScrollArea className="max-h-[calc(100vh-40px)] overflow-x-hidden">
        <form className="min-w-0" onSubmit={saveDraft}>
          <DialogHeader className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-border bg-card/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
            <div>
              <DialogTitle className="text-[25px] leading-tight">{editingId ? "Edit Routine" : "New Routine"}</DialogTitle>
              <DialogDescription>{draft.steps.length} steps - {formatDuration(total)} total</DialogDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </DialogHeader>
          <label className="grid gap-2 text-sm text-muted-foreground">
            Routine name
            <input
              className="min-h-11 w-full min-w-0 rounded-md border border-input px-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              value={draft.name}
              maxLength={48}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <div className="mt-5 grid gap-3">
            {draft.steps.map((step, index) => (
              <div className="min-w-0 rounded-sm border border-border bg-surface p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:p-4" key={step.id}>
                <div className="mb-3">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Step {index + 1}</p>
                </div>
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)_minmax(0,150px)] lg:items-start">
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Name
                    <input className="min-h-11 w-full min-w-0 rounded-sm border border-input bg-surface px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring lg:text-sm" value={step.name} onChange={(event) => updateDraftStep(index, { name: event.target.value })} aria-label="Step name" />
                  </label>
                  <div className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
                    Duration
                    <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] gap-2 sm:grid-cols-[44px_minmax(0,1fr)_44px]">
                      <Button type="button" variant="secondary" size="icon" className="h-10 min-h-10 w-10 min-w-10 sm:h-11 sm:min-h-11 sm:w-11 sm:min-w-11" onClick={() => updateDraftStep(index, secondsToStepPatch(rawDurationSeconds(step) - 15))} aria-label="Decrease duration by 15 seconds">-</Button>
                      <input
                        className="min-h-11 w-full min-w-0 rounded-sm border border-input bg-surface px-2 text-center text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring lg:text-sm"
                        inputMode="numeric"
                        value={formatDurationInput(rawDurationSeconds(step))}
                        onChange={(event) => updateDraftStep(index, parseDurationInput(event.target.value))}
                        aria-label="Duration"
                      />
                      <Button type="button" variant="secondary" size="icon" className="h-10 min-h-10 w-10 min-w-10 sm:h-11 sm:min-h-11 sm:w-11 sm:min-w-11" onClick={() => updateDraftStep(index, secondsToStepPatch(rawDurationSeconds(step) + 15))} aria-label="Increase duration by 15 seconds">+</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {durationPresets.map((preset) => (
                        <button
                          className={cn(
                            "min-h-8 rounded-full border px-2.5 text-sm transition",
                            rawDurationSeconds(step) === preset ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted text-foreground hover:border-primary/40",
                          )}
                          type="button"
                          key={preset}
                          onClick={() => updateDraftStep(index, secondsToStepPatch(preset))}
                        >
                          {formatDurationInput(preset)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Type
                    <select className="min-h-11 w-full min-w-0 rounded-sm border border-input bg-surface px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring lg:text-sm" value={step.type} onChange={(event) => updateDraftStep(index, { type: event.target.value })} aria-label="Step type">
                      {["prepare", "activity", "rest", "finish", "meditation", "yoga", "study", "custom"].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
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
