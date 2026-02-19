import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./App.css";

type WorkoutType = "Strength" | "Cardio" | "Mobility" | "Recovery";

type Workout = {
  id: string;
  type: WorkoutType;
  minutes: number;
  intensity: number;
  note: string;
  createdAt: string;
};

type TgUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TgWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: { user?: TgUser };
  colorScheme?: "light" | "dark";
  platform?: string;
  version?: string;
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

const STORAGE_KEY = "gym-check-workouts-v1";
const GOAL_KEY = "gym-check-weekly-goal-v1";
const DEFAULT_GOAL = 4;

const workoutLabels: Record<WorkoutType, string> = {
  Strength: "Strength",
  Cardio: "Cardio",
  Mobility: "Mobility",
  Recovery: "Recovery",
};

const defaultForm = {
  type: "Strength" as WorkoutType,
  minutes: "45",
  intensity: 3,
  note: "",
};

function isWorkoutType(value: unknown): value is WorkoutType {
  return value === "Strength" || value === "Cardio" || value === "Mobility" || value === "Recovery";
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return start;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function loadWorkouts(): Workout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const minutes = Number(item?.minutes);
        const intensity = Number(item?.intensity);

        return {
          id: typeof item?.id === "string" ? item.id : createId(),
          type: isWorkoutType(item?.type) ? item.type : "Strength",
          minutes: Number.isFinite(minutes) ? Math.max(1, Math.trunc(minutes)) : 0,
          intensity: Number.isFinite(intensity) ? Math.min(5, Math.max(1, Math.trunc(intensity))) : 3,
          note: typeof item?.note === "string" ? item.note.trim().slice(0, 120) : "",
          createdAt: typeof item?.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        } as Workout;
      })
      .filter((item) => item.minutes > 0 && !Number.isNaN(Date.parse(item.createdAt)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

function loadGoal(): number {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    const value = Number(raw);
    if (!Number.isFinite(value)) return DEFAULT_GOAL;
    return Math.min(10, Math.max(1, Math.trunc(value)));
  } catch {
    return DEFAULT_GOAL;
  }
}

function getStreakDays(workouts: Workout[]): number {
  const days = new Set(workouts.map((item) => dayKey(new Date(item.createdAt))));
  const pointer = new Date();
  pointer.setHours(0, 0, 0, 0);

  let streak = 0;
  while (days.has(dayKey(pointer))) {
    streak += 1;
    pointer.setDate(pointer.getDate() - 1);
  }
  return streak;
}

function formatWorkoutDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const [workouts, setWorkouts] = useState<Workout[]>(() => loadWorkouts());
  const [goal, setGoal] = useState<number>(() => loadGoal());
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState("");

  const isDark = tg?.colorScheme === "dark";
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "Athlete";

  const weekStart = useMemo(() => getWeekStart(new Date()), []);

  const workoutsThisWeek = useMemo(
    () => workouts.filter((item) => new Date(item.createdAt) >= weekStart).length,
    [workouts, weekStart],
  );

  const minutesThisWeek = useMemo(
    () => workouts
      .filter((item) => new Date(item.createdAt) >= weekStart)
      .reduce((sum, item) => sum + item.minutes, 0),
    [workouts, weekStart],
  );

  const streakDays = useMemo(() => getStreakDays(workouts), [workouts]);
  const progress = Math.min(100, Math.round((workoutsThisWeek / goal) * 100));
  const leftToGoal = Math.max(0, goal - workoutsThisWeek);
  const recentWorkouts = workouts.slice(0, 6);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    localStorage.setItem(GOAL_KEY, String(goal));
  }, [goal]);

  useEffect(() => {
    if (!status) return;
    const timerId = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(timerId);
  }, [status]);

  function addWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const minutes = Number(form.minutes);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 300) {
      setStatus("Enter minutes from 5 to 300.");
      return;
    }

    const item: Workout = {
      id: createId(),
      type: form.type,
      minutes: Math.round(minutes),
      intensity: form.intensity,
      note: form.note.trim().slice(0, 120),
      createdAt: new Date().toISOString(),
    };

    setWorkouts((prev) => [item, ...prev]);
    setForm((prev) => ({ ...prev, minutes: "45", note: "" }));
    setStatus("Workout saved.");
    tg?.HapticFeedback?.impactOccurred?.("medium");
  }

  function deleteWorkout(id: string) {
    setWorkouts((prev) => prev.filter((item) => item.id !== id));
  }

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <div className={`app-shell ${isDark ? "theme-dark" : "theme-light"}`}>
      <main className="app-main">
        <section className="card hero reveal r1">
          <p className="eyebrow">Gym Check</p>
          <h1>
            Welcome back, <span>{userName}</span>
          </h1>
          <p className="hero-text">Track your workouts and keep momentum every week.</p>
          <div className="hero-meta">
            <span>{todayLabel}</span>
            <span>{tg?.platform ? `${tg.platform} • v${tg.version ?? "?"}` : "Browser preview"}</span>
          </div>
        </section>

        <section className="stats-grid reveal r2">
          <article className="card stat-card">
            <p className="stat-label">This Week</p>
            <p className="stat-value">{workoutsThisWeek}</p>
            <p className="stat-caption">workouts</p>
          </article>

          <article className="card stat-card">
            <p className="stat-label">Streak</p>
            <p className="stat-value">{streakDays}</p>
            <p className="stat-caption">days in a row</p>
          </article>

          <article className="card stat-card">
            <p className="stat-label">Minutes</p>
            <p className="stat-value">{minutesThisWeek}</p>
            <p className="stat-caption">this week</p>
          </article>
        </section>

        <section className="card reveal r3">
          <div className="section-head">
            <h2>Add Workout</h2>
            <p>{status || "Log a session in under 10 seconds."}</p>
          </div>

          <form className="workout-form" onSubmit={addWorkout}>
            <label className="field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as WorkoutType }))}
              >
                {Object.entries(workoutLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Minutes</span>
              <input
                type="number"
                min={5}
                max={300}
                value={form.minutes}
                onChange={(event) => setForm((prev) => ({ ...prev, minutes: event.target.value }))}
                placeholder="45"
              />
            </label>

            <label className="field field-intensity">
              <span>Intensity: {form.intensity}/5</span>
              <input
                type="range"
                min={1}
                max={5}
                value={form.intensity}
                onChange={(event) => setForm((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
              />
            </label>

            <label className="field field-note">
              <span>Notes (optional)</span>
              <input
                type="text"
                value={form.note}
                maxLength={120}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Leg day, PR attempts, light run..."
              />
            </label>

            <button className="primary-btn" type="submit">
              Save Workout
            </button>
          </form>
        </section>

        <section className="card reveal r4">
          <div className="section-head compact">
            <h2>Weekly Goal</h2>
            <p>{workoutsThisWeek >= goal ? "Goal reached. Keep rolling." : `${leftToGoal} left to hit your goal.`}</p>
          </div>

          <label className="goal-label" htmlFor="goal-range">
            Goal: <strong>{goal}</strong> workouts
          </label>
          <input
            id="goal-range"
            className="goal-range"
            type="range"
            min={1}
            max={10}
            value={goal}
            onChange={(event) => setGoal(Number(event.target.value))}
          />

          <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">{progress}% complete this week</p>
        </section>

        <section className="card reveal r5">
          <div className="section-head compact">
            <h2>Recent Workouts</h2>
            <p>{recentWorkouts.length ? "Latest sessions" : "No sessions yet"}</p>
          </div>

          {recentWorkouts.length === 0 ? (
            <p className="empty-state">Start with your first workout above.</p>
          ) : (
            <ul className="history-list">
              {recentWorkouts.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-copy">
                    <p className="history-title">
                      {workoutLabels[item.type]} • {item.minutes} min • Intensity {item.intensity}/5
                    </p>
                    <p className="history-meta">
                      {formatWorkoutDate(item.createdAt)}
                      {item.note ? ` • ${item.note}` : ""}
                    </p>
                  </div>

                  <button className="ghost-btn" type="button" onClick={() => deleteWorkout(item.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer-note">
          {tg?.initData ? "Telegram session connected" : "Opened outside Telegram: demo mode"}
        </footer>
      </main>
    </div>
  );
}
