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
  Strength: "Силовая",
  Cardio: "Кардио",
  Mobility: "Мобильность",
  Recovery: "Восстановление",
};

type ExerciseCategory = {
  id: string;
  title: string;
  exercises: string[];
};

const exerciseCatalog: ExerciseCategory[] = [
  {
    id: "legs",
    title: "Ноги и ягодицы",
    exercises: [
      "Приседания",
      "Выпады",
      "Ягодичный мостик",
      "Махи ногой назад/в бок на четвереньках",
      "Становая тяга",
    ],
  },
  {
    id: "shoulders",
    title: "Плечи",
    exercises: [
      "Жим в плечевом тренажере",
      "Жим гантелей сидя",
      "Тяга к подбородку",
      "Тяга к поясу",
      "Разведение гантелей в стороны",
    ],
  },
  {
    id: "back",
    title: "Спина",
    exercises: [
      "Тяга верхнего блока",
      "Тяга горизонтального блока",
      "Гиперэкстензия",
      "Тяга грифа к поясу",
      "Тяга в рычажном тренажере",
    ],
  },
  {
    id: "chest",
    title: "Грудь",
    exercises: [
      "Жим лежа",
      "Отжимания на брусьях",
      "Отжимания от пола",
      "Разведение гантелей лежа",
      "Разведение в тренажере",
    ],
  },
  {
    id: "triceps",
    title: "Трицепс",
    exercises: [
      "Разгибания рук в блоке",
      "Разгибание рук с гантелями на трицепс",
      "Французский жим",
      "Отжимания на брусьях",
      "Обратные отжимания",
    ],
  },
];

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

function formatWorkoutDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
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
  const [activeCategoryId, setActiveCategoryId] = useState(exerciseCatalog[0].id);

  const isDark = tg?.colorScheme === "dark";
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "Спортсмен";
  const locale = tg?.initDataUnsafe?.user?.language_code || "ru-RU";

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
  const activeCategory = useMemo(
    () => exerciseCatalog.find((category) => category.id === activeCategoryId) ?? exerciseCatalog[0],
    [activeCategoryId],
  );

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
      setStatus("Укажи длительность от 5 до 300 минут.");
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
    setStatus("Тренировка сохранена.");
    tg?.HapticFeedback?.impactOccurred?.("medium");
  }

  function deleteWorkout(id: string) {
    setWorkouts((prev) => prev.filter((item) => item.id !== id));
  }

  function addExerciseToNote(exercise: string) {
    setForm((prev) => {
      const nextNote = prev.note.trim() ? `${exercise}; ${prev.note.trim()}` : exercise;
      return { ...prev, note: nextNote.slice(0, 120) };
    });
    setStatus(`Добавлено в заметки: ${exercise}`);
    tg?.HapticFeedback?.impactOccurred?.("light");
  }

  const todayLabel = new Intl.DateTimeFormat(locale, {
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
            С возвращением, <span>{userName}</span>
          </h1>
          <p className="hero-text">Отмечай тренировки и держи ритм каждую неделю.</p>
          <div className="hero-meta">
            <span>{todayLabel}</span>
            <span>{tg?.platform ? `${tg.platform} • v${tg.version ?? "?"}` : "Предпросмотр в браузере"}</span>
          </div>
        </section>

        <section className="stats-grid reveal r2">
          <article className="card stat-card">
            <p className="stat-label">Эта неделя</p>
            <p className="stat-value">{workoutsThisWeek}</p>
            <p className="stat-caption">тренировок</p>
          </article>

          <article className="card stat-card">
            <p className="stat-label">Серия</p>
            <p className="stat-value">{streakDays}</p>
            <p className="stat-caption">дней подряд</p>
          </article>

          <article className="card stat-card">
            <p className="stat-label">Минуты</p>
            <p className="stat-value">{minutesThisWeek}</p>
            <p className="stat-caption">за неделю</p>
          </article>
        </section>

        <section className="card reveal r3">
          <div className="section-head">
            <h2>Добавить тренировку</h2>
            <p>{status || "Запиши тренировку меньше чем за 10 секунд."}</p>
          </div>

          <form className="workout-form" onSubmit={addWorkout}>
            <label className="field">
              <span>Тип</span>
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
              <span>Минуты</span>
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
              <span>Интенсивность: {form.intensity}/5</span>
              <input
                type="range"
                min={1}
                max={5}
                value={form.intensity}
                onChange={(event) => setForm((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
              />
            </label>

            <label className="field field-note">
              <span>Заметки (необязательно)</span>
              <input
                type="text"
                value={form.note}
                maxLength={120}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="День ног, попытки PR, легкий бег..."
              />
            </label>

            <button className="primary-btn" type="submit">
              Сохранить тренировку
            </button>
          </form>
        </section>

        <section className="card reveal r4">
          <div className="section-head compact">
            <h2>Каталог упражнений</h2>
            <p>Выбери группу мышц и добавь упражнение в заметки одним нажатием.</p>
          </div>

          <div className="catalog-tabs" role="tablist" aria-label="Группы мышц">
            {exerciseCatalog.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`catalog-tab ${category.id === activeCategory.id ? "is-active" : ""}`}
                onClick={() => setActiveCategoryId(category.id)}
                aria-pressed={category.id === activeCategory.id}
              >
                {category.title}
              </button>
            ))}
          </div>

          <ul className="exercise-list">
            {activeCategory.exercises.map((exercise) => (
              <li key={exercise} className="exercise-item">
                <span className="exercise-name">{exercise}</span>
                <button className="exercise-add-btn" type="button" onClick={() => addExerciseToNote(exercise)}>
                  В заметки
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card reveal r5">
          <div className="section-head compact">
            <h2>Цель на неделю</h2>
            <p>{workoutsThisWeek >= goal ? "Цель выполнена. Отличная работа." : `До цели осталось: ${leftToGoal}.`}</p>
          </div>

          <label className="goal-label" htmlFor="goal-range">
            Цель: <strong>{goal}</strong> тренировок
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
          <p className="progress-text">{progress}% выполнено за неделю</p>
        </section>

        <section className="card reveal r6">
          <div className="section-head compact">
            <h2>Последние тренировки</h2>
            <p>{recentWorkouts.length ? "Недавние сессии" : "Пока нет тренировок"}</p>
          </div>

          {recentWorkouts.length === 0 ? (
            <p className="empty-state">Начни с первой тренировки выше.</p>
          ) : (
            <ul className="history-list">
              {recentWorkouts.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-copy">
                    <p className="history-title">
                      {workoutLabels[item.type]} • {item.minutes} мин • Интенсивность {item.intensity}/5
                    </p>
                    <p className="history-meta">
                      {formatWorkoutDate(item.createdAt, locale)}
                      {item.note ? ` • ${item.note}` : ""}
                    </p>
                  </div>

                  <button className="ghost-btn" type="button" onClick={() => deleteWorkout(item.id)}>
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer-note">
          {tg?.initData ? "Сессия Telegram подключена" : "Открыто вне Telegram: демо-режим"}
        </footer>
      </main>
    </div>
  );
}
