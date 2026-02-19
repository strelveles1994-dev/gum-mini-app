import { useEffect, useMemo, useState } from "react";
import "./App.css";

type TgUser = {
  first_name?: string;
  language_code?: string;
};

type TgWebApp = {
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  initDataUnsafe?: { user?: TgUser };
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

type DayPlanId = "upper" | "lower" | "cardio";

type DayPlan = {
  id: DayPlanId;
  title: string;
  subtitle: string;
  icon: string;
  image: string;
};

type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
};

type SessionExercise = {
  id: string;
  name: string;
  expanded: boolean;
  sets: WorkoutSet[];
};

type SessionByPlan = Record<DayPlanId, SessionExercise[]>;
type SelectedExerciseByPlan = Record<DayPlanId, string>;

type SetField = "weight" | "reps";

const STORAGE_KEY = "gym-check-session-v4";
const DEFAULT_REST_SECONDS = 90;

const dayPlans: DayPlan[] = [
  {
    id: "upper",
    title: "День верха",
    subtitle: "Грудь, спина, плечи и руки",
    icon: "💪",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "lower",
    title: "Ноги и ягодицы",
    subtitle: "Квадрицепс, бицепс бедра, ягодицы",
    icon: "🦵",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cardio",
    title: "День кардио",
    subtitle: "Выносливость, пульс и жиросжигание",
    icon: "❤️",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
  },
];

const exercisesByPlan: Record<DayPlanId, string[]> = {
  upper: [
    "Жим лежа",
    "Тяга верхнего блока",
    "Тяга горизонтального блока",
    "Жим гантелей сидя",
    "Тяга к подбородку",
    "Разведение гантелей в стороны",
    "Французский жим",
    "Разгибания рук в блоке",
    "Сгибания рук с гантелями",
    "Отжимания на брусьях",
  ],
  lower: [
    "Приседания",
    "Выпады",
    "Ягодичный мостик",
    "Румынская тяга",
    "Становая тяга",
    "Болгарские сплит-приседания",
    "Жим ногами",
    "Махи ногой в сторону",
    "Отведение ноги назад в кроссовере",
    "Гиперэкстензия",
  ],
  cardio: [
    "Беговая дорожка (ровный темп)",
    "Интервальный бег",
    "Велотренажер",
    "Эллипс",
    "Гребной тренажер",
    "Скакалка интервалы",
    "Ходьба в горку",
    "Степпер",
    "Air Bike интервалы",
    "HIIT-круг 20/40",
  ],
};

const dayPlanById: Record<DayPlanId, DayPlan> = {
  upper: dayPlans[0],
  lower: dayPlans[1],
  cardio: dayPlans[2],
};

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function sanitizeNumber(value: unknown, maxDigits: number): string {
  return String(value ?? "")
    .replace(/[^\d]/g, "")
    .slice(0, maxDigits);
}

function createSet(weight = "", reps = ""): WorkoutSet {
  return {
    id: createId(),
    weight: sanitizeNumber(weight, 3),
    reps: sanitizeNumber(reps, 2),
  };
}

function createExercise(name: string, sets?: WorkoutSet[]): SessionExercise {
  return {
    id: createId(),
    name,
    expanded: false,
    sets: sets && sets.length > 0 ? sets : [createSet()],
  };
}

function buildDefaultSessionByPlan(): SessionByPlan {
  return {
    upper: [
      createExercise("Жим лежа", [createSet("35", "12"), createSet("40", "10")]),
      createExercise("Тяга верхнего блока", [createSet("40", "12")]),
    ],
    lower: [
      createExercise("Приседания", [createSet("45", "12"), createSet("50", "10")]),
      createExercise("Ягодичный мостик", [createSet("60", "12")]),
    ],
    cardio: [
      createExercise("Беговая дорожка (ровный темп)", [createSet("0", "20")]),
      createExercise("Велотренажер", [createSet("0", "15")]),
    ],
  };
}

function normalizeExercises(input: unknown): SessionExercise[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim().slice(0, 80) : "";
      if (!name) return null;

      const sets = Array.isArray(item?.sets)
        ? item.sets.map((setItem: { weight?: unknown; reps?: unknown }) =>
            createSet(
              typeof setItem?.weight === "string" ? setItem.weight : String(setItem?.weight ?? ""),
              typeof setItem?.reps === "string" ? setItem.reps : String(setItem?.reps ?? ""),
            ),
          )
        : [createSet()];

      return {
        id: createId(),
        name,
        expanded: Boolean(item?.expanded),
        sets: sets.length > 0 ? sets : [createSet()],
      } as SessionExercise;
    })
    .filter((item): item is SessionExercise => item !== null);
}

function loadSessionByPlan(): SessionByPlan {
  const fallback = buildDefaultSessionByPlan();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;

    const upper = normalizeExercises((parsed as Partial<SessionByPlan>).upper);
    const lower = normalizeExercises((parsed as Partial<SessionByPlan>).lower);
    const cardio = normalizeExercises((parsed as Partial<SessionByPlan>).cardio);

    return {
      upper: upper.length > 0 ? upper : fallback.upper,
      lower: lower.length > 0 ? lower : fallback.lower,
      cardio: cardio.length > 0 ? cardio : fallback.cardio,
    };
  } catch {
    return fallback;
  }
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "спортсмен";
  const isDark = tg?.colorScheme === "dark";

  const [selectedPlanId, setSelectedPlanId] = useState<DayPlanId>("upper");
  const [sessionByPlan, setSessionByPlan] = useState<SessionByPlan>(() => loadSessionByPlan());
  const [selectedExerciseByPlan, setSelectedExerciseByPlan] = useState<SelectedExerciseByPlan>({
    upper: exercisesByPlan.upper[0],
    lower: exercisesByPlan.lower[0],
    cardio: exercisesByPlan.cardio[0],
  });
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const selectedPlan = dayPlanById[selectedPlanId];
  const activeExercises = sessionByPlan[selectedPlanId];

  const setCountsByPlan = useMemo(
    () => ({
      upper: sessionByPlan.upper.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      lower: sessionByPlan.lower.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      cardio: sessionByPlan.cardio.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    }),
    [sessionByPlan],
  );

  const personalRecords = useMemo(() => {
    const records = new Map<string, number>();

    Object.values(sessionByPlan)
      .flat()
      .forEach((exercise) => {
        const maxWeight = exercise.sets.reduce((max, setItem) => {
          const weight = Number(setItem.weight);
          if (!Number.isFinite(weight)) return max;
          return Math.max(max, weight);
        }, 0);

        const current = records.get(exercise.name) ?? 0;
        records.set(exercise.name, Math.max(current, maxWeight));
      });

    return records;
  }, [sessionByPlan]);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionByPlan));
  }, [sessionByPlan]);

  useEffect(() => {
    if (!notice) return;
    const timerId = setTimeout(() => setNotice(""), 2000);
    return () => clearTimeout(timerId);
  }, [notice]);

  useEffect(() => {
    if (restSeconds === null) return;

    const timerId = window.setTimeout(() => {
      setRestSeconds((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          setNotice("Отдых завершен. Следующий подход.");
          tg?.HapticFeedback?.impactOccurred?.("medium");
          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [restSeconds, tg]);

  function updateExercisesForPlan(planId: DayPlanId, updater: (prev: SessionExercise[]) => SessionExercise[]) {
    setSessionByPlan((prev) => ({
      ...prev,
      [planId]: updater(prev[planId]),
    }));
  }

  function toggleExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, expanded: !exercise.expanded } : exercise,
      ),
    );
  }

  function updateSetValue(exerciseId: string, setId: string, field: SetField, value: string) {
    const sanitized = sanitizeNumber(value, field === "weight" ? 3 : 2);

    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) =>
            setItem.id === setId ? { ...setItem, [field]: sanitized } : setItem,
          ),
        };
      }),
    );
  }

  function addSet(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        const lastSet = exercise.sets[exercise.sets.length - 1];

        return {
          ...exercise,
          expanded: true,
          sets: [...exercise.sets, createSet(lastSet?.weight ?? "", lastSet?.reps ?? "")],
        };
      }),
    );

    setRestSeconds(DEFAULT_REST_SECONDS);
    setNotice(`Подход добавлен • отдых ${formatSeconds(DEFAULT_REST_SECONDS)}`);
    tg?.HapticFeedback?.impactOccurred?.("light");
  }

  function removeExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) => prev.filter((exercise) => exercise.id !== exerciseId));
    setNotice("Упражнение удалено");
  }

  function addExerciseFromDropdown() {
    const exerciseName = selectedExerciseByPlan[selectedPlanId];
    if (!exerciseName) return;

    let duplicate = false;

    updateExercisesForPlan(selectedPlanId, (prev) => {
      const exists = prev.some((exercise) => exercise.name.toLowerCase() === exerciseName.toLowerCase());
      if (exists) {
        duplicate = true;
        return prev.map((exercise) =>
          exercise.name.toLowerCase() === exerciseName.toLowerCase() ? { ...exercise, expanded: true } : exercise,
        );
      }

      return [...prev, createExercise(exerciseName, [createSet()])];
    });

    if (duplicate) {
      setNotice("Это упражнение уже есть в текущем дне");
      return;
    }

    setNotice(`Добавлено: ${exerciseName}`);
    tg?.HapticFeedback?.impactOccurred?.("medium");
  }

  return (
    <div className={`app-shell ${isDark ? "theme-dark" : "theme-light"}`}>
      <main className="workout-app">
        <header className="top-row">
          <div>
            <p className="app-title">Тренировки</p>
            <p className="app-subtitle">Сегодня для тебя, {userName}</p>
          </div>
          <button className="avatar-btn" type="button" aria-label="Профиль">
            👤
          </button>
        </header>

        <section className="plan-tabs" aria-label="Тип тренировочного дня">
          {dayPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              className={`plan-tab ${selectedPlanId === plan.id ? "is-active" : ""}`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <span className="tab-title">{plan.title}</span>
              <span className="tab-count">{setCountsByPlan[plan.id]}</span>
            </button>
          ))}
        </section>

        <section
          className="plan-hero"
          style={{
            backgroundImage: `linear-gradient(120deg, rgba(20, 26, 40, 0.42), rgba(20, 26, 40, 0.12)), url(${selectedPlan.image})`,
          }}
        >
          <p className="plan-hero-title">{selectedPlan.title}</p>
          <p className="plan-hero-subtitle">{selectedPlan.subtitle}</p>
        </section>

        <section className="exercise-picker" aria-label="Добавление упражнения">
          <label htmlFor="exercise-select">Упражнения для: {selectedPlan.title}</label>
          <div className="picker-row">
            <select
              id="exercise-select"
              className="picker-select"
              value={selectedExerciseByPlan[selectedPlanId]}
              onChange={(event) =>
                setSelectedExerciseByPlan((prev) => ({
                  ...prev,
                  [selectedPlanId]: event.target.value,
                }))
              }
            >
              {exercisesByPlan[selectedPlanId].map((exerciseName) => (
                <option key={exerciseName} value={exerciseName}>
                  {exerciseName}
                </option>
              ))}
            </select>
            <button type="button" className="picker-add-btn" onClick={addExerciseFromDropdown}>
              Добавить
            </button>
          </div>
        </section>

        {notice ? <p className="inline-notice">{notice}</p> : null}

        {restSeconds !== null ? (
          <section className="rest-timer" aria-label="Таймер отдыха">
            <div>
              <p className="rest-label">Отдых</p>
              <p className="rest-value">{formatSeconds(restSeconds)}</p>
            </div>
            <div className="rest-actions">
              <button
                type="button"
                className="rest-btn"
                onClick={() => setRestSeconds((prev) => (prev === null ? DEFAULT_REST_SECONDS : Math.min(prev + 30, 600)))}
              >
                +30с
              </button>
              <button type="button" className="rest-btn is-ghost" onClick={() => setRestSeconds(null)}>
                Пропустить
              </button>
            </div>
          </section>
        ) : null}

        <section className="exercise-board" aria-label="Список упражнений">
          {activeExercises.length === 0 ? (
            <p className="exercise-empty">В этом дне пока нет упражнений. Выбери из выпадающего списка выше.</p>
          ) : (
            activeExercises.map((exercise) => {
              const prWeight = personalRecords.get(exercise.name) ?? 0;

              return (
                <article key={exercise.id} className={`exercise-card ${exercise.expanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="exercise-head"
                    onClick={() => toggleExercise(exercise.id)}
                    aria-expanded={exercise.expanded}
                  >
                    <span className="exercise-icon" aria-hidden="true">
                      {selectedPlan.icon}
                    </span>
                    <span className="exercise-text">
                      <strong>{exercise.name}</strong>
                      <small>{selectedPlan.title}</small>
                    </span>
                    {prWeight > 0 ? <span className="exercise-pr">PR {prWeight} кг</span> : null}
                    <span className="exercise-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {exercise.expanded ? (
                    <div className="set-panel">
                      <div className="set-head">
                        <span>№</span>
                        <span>вес (кг)</span>
                        <span>повт.</span>
                      </div>

                      {exercise.sets.map((setItem, index) => (
                        <div key={setItem.id} className="set-row">
                          <span className="set-index">{index + 1}</span>
                          <input
                            className="set-input"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={setItem.weight}
                            onChange={(event) => updateSetValue(exercise.id, setItem.id, "weight", event.target.value)}
                          />
                          <input
                            className="set-input"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={setItem.reps}
                            onChange={(event) => updateSetValue(exercise.id, setItem.id, "reps", event.target.value)}
                          />
                        </div>
                      ))}

                      <div className="set-actions">
                        <button type="button" className="add-set-btn" onClick={() => addSet(exercise.id)}>
                          Добавить подход
                        </button>
                        <button type="button" className="remove-ex-btn" onClick={() => removeExercise(exercise.id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
