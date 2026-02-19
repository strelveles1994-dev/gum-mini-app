import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  baseExercisesByPlan,
  exerciseCatalogByPlan,
  formatMuscleList,
  getExerciseDefinition,
  muscleLabelByKey,
  type BasePlanId,
  type ExerciseDefinition,
} from "./exerciseCatalog";

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

type DayPlanId = "upper" | "lower" | "cardio" | "custom";
type CustomLibraryFilter = "all" | BasePlanId;
type IconName = DayPlanId | "profile";

type DayPlan = {
  id: DayPlanId;
  title: string;
  subtitle: string;
  icon: IconName;
  image: string;
};

type CalendarDay = {
  key: string;
  weekday: string;
  dayNumber: string;
  fullLabel: string;
  isToday: boolean;
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
const customFilterOptions: { id: CustomLibraryFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "upper", label: "Верх" },
  { id: "lower", label: "Ноги" },
  { id: "cardio", label: "Кардио" },
];

const dayPlans: DayPlan[] = [
  {
    id: "upper",
    title: "День верха",
    subtitle: "Грудь, спина, плечи и руки",
    icon: "upper",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "lower",
    title: "Ноги и ягодицы",
    subtitle: "Квадрицепс, бицепс бедра, ягодицы",
    icon: "lower",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cardio",
    title: "День кардио",
    subtitle: "Выносливость, пульс и жиросжигание",
    icon: "cardio",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "custom",
    title: "Своя программа",
    subtitle: "Собери тренировку из базы упражнений",
    icon: "custom",
    image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80",
  },
];

const customLibrarySections: { id: BasePlanId; title: string; icon: IconName }[] = [
  { id: "upper", title: "Верх тела", icon: "upper" },
  { id: "lower", title: "Ноги и ягодицы", icon: "lower" },
  { id: "cardio", title: "Кардио", icon: "cardio" },
];

const exerciseDefinitionsByPlan: Record<BasePlanId, ExerciseDefinition[]> = {
  upper: exerciseCatalogByPlan.upper,
  lower: exerciseCatalogByPlan.lower,
  cardio: exerciseCatalogByPlan.cardio,
};

const allLibraryExercises = Array.from(new Set(Object.values(baseExercisesByPlan).flat()));

const exercisesByPlan: Record<DayPlanId, string[]> = {
  ...baseExercisesByPlan,
  custom: allLibraryExercises,
};

const dayPlanById: Record<DayPlanId, DayPlan> = dayPlans.reduce(
  (acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  },
  {} as Record<DayPlanId, DayPlan>,
);

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
      createExercise("Жим штанги лежа", [createSet("35", "12"), createSet("40", "10")]),
      createExercise("Тяга верхнего блока широким хватом", [createSet("40", "12")]),
    ],
    lower: [
      createExercise("Приседания со штангой", [createSet("45", "12"), createSet("50", "10")]),
      createExercise("Ягодичный мостик со штангой", [createSet("60", "12")]),
    ],
    cardio: [
      createExercise("Бег на дорожке (легкий темп)", [createSet("0", "20")]),
      createExercise("Велотренажер", [createSet("0", "15")]),
    ],
    custom: [],
  };
}

function normalizeExercises(input: unknown): SessionExercise[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim().slice(0, 80) : "";
      if (!name) return null;
      const canonicalName = getExerciseDefinition(name)?.name ?? name;

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
        name: canonicalName,
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
    const custom = normalizeExercises((parsed as Partial<SessionByPlan>).custom);

    return {
      upper: upper.length > 0 ? upper : fallback.upper,
      lower: lower.length > 0 ? lower : fallback.lower,
      cardio: cardio.length > 0 ? cardio : fallback.cardio,
      custom,
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

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const mondayBasedOffset = (day + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayBasedOffset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function buildCalendarWeek(baseDate: Date): CalendarDay[] {
  const weekStart = getWeekStart(baseDate);
  const todayKey = formatDateKey(baseDate);
  const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const fullLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    const key = formatDateKey(date);
    const weekday = weekdayFormatter.format(date).replace(".", "").slice(0, 2).toUpperCase();

    return {
      key,
      weekday,
      dayNumber: String(date.getDate()),
      fullLabel: fullLabelFormatter.format(date),
      isToday: key === todayKey,
    };
  });
}

function AppIcon({ name, className }: { name: IconName; className?: string }) {
  if (name === "upper") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6 11.5H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 8.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4.5 9V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19.5 9V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "lower") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M8.5 4.5L11.2 9.6L8.6 13.5L10.5 19.5H14.2L12.4 13.4L15.8 9.4L13.3 4.5H8.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "cardio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 20.2C7.7 16.9 4.8 14.1 4.8 10.4C4.8 7.9 6.7 6 9.1 6C10.6 6 11.8 6.8 12.5 8.1C13.2 6.8 14.4 6 15.9 6C18.3 6 20.2 7.9 20.2 10.4C20.2 14.1 17.3 16.9 13 20.2L12.5 20.6L12 20.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M7.4 11.5H10L11.4 9.3L13.1 13.3L14.6 11.5H16.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "custom") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4.7L13.8 9.2L18.4 11L13.8 12.8L12 17.3L10.2 12.8L5.6 11L10.2 9.2L12 4.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M18.2 5.7L18.8 7.3L20.4 7.9L18.8 8.5L18.2 10.1L17.6 8.5L16 7.9L17.6 7.3L18.2 5.7Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8.1" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.9 18.5C7 15.7 9.1 14.3 12 14.3C14.9 14.3 17 15.7 18.1 18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "спортсмен";
  const isDark = tg?.colorScheme === "dark";

  const weekDays = useMemo(() => buildCalendarWeek(new Date()), []);
  const [selectedPlanId, setSelectedPlanId] = useState<DayPlanId>("upper");
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [sessionByPlan, setSessionByPlan] = useState<SessionByPlan>(() => loadSessionByPlan());
  const [selectedExerciseByPlan, setSelectedExerciseByPlan] = useState<SelectedExerciseByPlan>({
    upper: exercisesByPlan.upper[0],
    lower: exercisesByPlan.lower[0],
    cardio: exercisesByPlan.cardio[0],
    custom: exercisesByPlan.custom[0] ?? "",
  });
  const [customSearch, setCustomSearch] = useState("");
  const [customFilter, setCustomFilter] = useState<CustomLibraryFilter>("all");
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const selectedPlan = dayPlanById[selectedPlanId];
  const activeExercises = sessionByPlan[selectedPlanId];
  const selectedCalendarDay = weekDays.find((day) => day.key === selectedDateKey) ?? weekDays[0];
  const normalizedCustomSearch = customSearch.trim().toLowerCase();
  const customExerciseNameSet = useMemo(
    () => new Set(sessionByPlan.custom.map((exercise) => exercise.name.toLowerCase())),
    [sessionByPlan.custom],
  );

  const filteredCustomSections = useMemo(
    () =>
      customLibrarySections
        .filter((section) => customFilter === "all" || section.id === customFilter)
        .map((section) => ({
          ...section,
          exercises: exerciseDefinitionsByPlan[section.id].filter((exerciseDef) => {
            if (!normalizedCustomSearch) return true;

            const musclesText = [...exerciseDef.primaryMuscles, ...exerciseDef.secondaryMuscles]
              .map((muscleKey) => muscleLabelByKey[muscleKey] ?? muscleKey)
              .join(" ")
              .toLowerCase();

            return (
              exerciseDef.name.toLowerCase().includes(normalizedCustomSearch) ||
              exerciseDef.sourceName.toLowerCase().includes(normalizedCustomSearch) ||
              musclesText.includes(normalizedCustomSearch)
            );
          }),
        }))
        .filter((section) => section.exercises.length > 0),
    [customFilter, normalizedCustomSearch],
  );

  const setCountsByPlan = useMemo(
    () =>
      dayPlans.reduce(
        (counts, plan) => {
          counts[plan.id] = sessionByPlan[plan.id].reduce((sum, exercise) => sum + exercise.sets.length, 0);
          return counts;
        },
        {} as Record<DayPlanId, number>,
      ),
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

  function toggleExerciseInCustomProgram(exerciseName: string) {
    let added = false;

    updateExercisesForPlan("custom", (prev) => {
      const exists = prev.some((exercise) => exercise.name.toLowerCase() === exerciseName.toLowerCase());
      if (exists) {
        return prev.filter((exercise) => exercise.name.toLowerCase() !== exerciseName.toLowerCase());
      }

      added = true;
      return [...prev, createExercise(exerciseName, [createSet()])];
    });

    if (added) {
      setNotice(`Добавлено в свою программу: ${exerciseName}`);
      tg?.HapticFeedback?.impactOccurred?.("light");
      return;
    }

    setNotice(`Убрано из своей программы: ${exerciseName}`);
    tg?.HapticFeedback?.impactOccurred?.("light");
  }

  function addExerciseFromDropdown() {
    if (selectedPlanId === "custom") return;

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
            <AppIcon name="profile" className="app-icon app-icon-md" />
          </button>
        </header>

        <section className="mini-calendar" aria-label="Календарь недели">
          <div className="mini-calendar-head">
            <p className="mini-calendar-title">Календарь</p>
            {selectedCalendarDay ? <p className="mini-calendar-selected">{selectedCalendarDay.fullLabel}</p> : null}
          </div>

          <div className="calendar-days">
            {weekDays.map((day) => (
              <button
                key={day.key}
                type="button"
                className={`calendar-day ${selectedDateKey === day.key ? "is-active" : ""} ${day.isToday ? "is-today" : ""}`}
                aria-label={day.fullLabel}
                onClick={() => setSelectedDateKey(day.key)}
              >
                <span className="calendar-weekday">{day.weekday}</span>
                <span className="calendar-number">{day.dayNumber}</span>
              </button>
            ))}
          </div>
        </section>

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

        {selectedPlanId === "custom" ? (
          <section className="custom-program-builder" aria-label="Конструктор своей программы">
            <div className="builder-head">
              <p className="builder-title">База упражнений</p>
              <p className="builder-subtitle">Выбери упражнения, которые хочешь добавить в свою программу</p>
            </div>

            <input
              id="custom-search"
              className="custom-search-input"
              type="search"
              placeholder="Найти упражнение"
              value={customSearch}
              onChange={(event) => setCustomSearch(event.target.value)}
            />

            <div className="builder-filters" aria-label="Фильтр упражнений">
              {customFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`builder-filter-btn ${customFilter === option.id ? "is-active" : ""}`}
                  onClick={() => setCustomFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="builder-library">
              {filteredCustomSections.length === 0 ? (
                <p className="builder-empty">По запросу ничего не найдено.</p>
              ) : (
                filteredCustomSections.map((section) => (
                  <div key={section.id} className="library-section">
                    <p className="library-section-title">
                      <span className="library-section-icon" aria-hidden="true">
                        <AppIcon name={section.icon} className="app-icon app-icon-xs" />
                      </span>
                      <span>{section.title}</span>
                    </p>

                    <div className="library-items">
                      {section.exercises.map((exerciseDef) => {
                        const exerciseName = exerciseDef.name;
                        const isAdded = customExerciseNameSet.has(exerciseName.toLowerCase());

                        return (
                          <button
                            key={exerciseName}
                            type="button"
                            className={`library-item ${isAdded ? "is-added" : ""}`}
                            onClick={() => toggleExerciseInCustomProgram(exerciseName)}
                          >
                            <span className="library-item-main">
                              <img
                                src={exerciseDef.image}
                                alt={exerciseName}
                                className="library-item-thumb"
                                loading="lazy"
                              />
                              <span className="library-item-copy">
                                <span className="library-item-name">{exerciseName}</span>
                                <span className="library-item-muscles">
                                  {formatMuscleList(exerciseDef.primaryMuscles, 2)}
                                </span>
                              </span>
                            </span>
                            <span className="library-item-action">{isAdded ? "Убрать" : "Добавить"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
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
        )}

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
            <p className="exercise-empty">
              {selectedPlanId === "custom"
                ? "Своя программа пока пустая. Добавь упражнения из базы выше."
                : "В этом дне пока нет упражнений. Выбери из выпадающего списка выше."}
            </p>
          ) : (
            activeExercises.map((exercise) => {
              const prWeight = personalRecords.get(exercise.name) ?? 0;
              const exerciseDef = getExerciseDefinition(exercise.name);
              const primaryMuscles = exerciseDef ? formatMuscleList(exerciseDef.primaryMuscles) : "";
              const secondaryMuscles =
                exerciseDef && exerciseDef.secondaryMuscles.length > 0
                  ? formatMuscleList(exerciseDef.secondaryMuscles, 4)
                  : "";

              return (
                <article key={exercise.id} className={`exercise-card ${exercise.expanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="exercise-head"
                    onClick={() => toggleExercise(exercise.id)}
                    aria-expanded={exercise.expanded}
                  >
                    <span className="exercise-icon" aria-hidden="true">
                      <AppIcon name={selectedPlan.icon} className="app-icon app-icon-sm" />
                    </span>
                    <span className="exercise-text">
                      <strong>{exercise.name}</strong>
                      <small>{exerciseDef ? `Основные: ${primaryMuscles}` : selectedPlan.title}</small>
                    </span>
                    {prWeight > 0 ? <span className="exercise-pr">PR {prWeight} кг</span> : null}
                    <span className="exercise-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {exercise.expanded ? (
                    <div className="set-panel">
                      {exerciseDef ? (
                        <div className="exercise-insight">
                          <img
                            className="exercise-photo"
                            src={exerciseDef.image}
                            alt={exercise.name}
                            loading="lazy"
                          />
                          <div className="exercise-muscle-copy">
                            <p>
                              <strong>Основные:</strong> {primaryMuscles}
                            </p>
                            {secondaryMuscles ? (
                              <p>
                                <strong>Дополнительно:</strong> {secondaryMuscles}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

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
