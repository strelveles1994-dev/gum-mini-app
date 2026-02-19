import { useEffect, useMemo, useState } from "react";
import "./App.css";

type TgUser = {
  id?: number;
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

type ExerciseGroup = {
  id: string;
  title: string;
  icon: string;
  coverImage: string;
  exercises: string[];
};

type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
};

type SessionExercise = {
  id: string;
  name: string;
  groupId: string;
  expanded: boolean;
  sets: WorkoutSet[];
};

type DayChip = {
  key: string;
  label: string;
  day: number;
  fullLabel: string;
  isToday: boolean;
};

const STORAGE_KEY = "gym-check-session-v3";
const DEFAULT_REST_SECONDS = 90;
const PROGRAM_IMAGES = {
  legs:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  upper:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
};

const exerciseGroups: ExerciseGroup[] = [
  {
    id: "legs",
    title: "Ноги и ягодицы",
    icon: "🦵",
    coverImage:
      "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80",
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
    icon: "💪",
    coverImage:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80",
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
    icon: "🪽",
    coverImage:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
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
    icon: "🏋️",
    coverImage:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80",
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
    icon: "🔥",
    coverImage:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=900&q=80",
    exercises: [
      "Разгибания рук в блоке",
      "Разгибание рук с гантелями на трицепс",
      "Французский жим",
      "Отжимания на брусьях",
      "Обратные отжимания",
    ],
  },
];

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

type CreateExerciseOptions = {
  sets?: WorkoutSet[];
  expanded?: boolean;
};

function createExercise(name: string, groupId: string, options: CreateExerciseOptions = {}): SessionExercise {
  return {
    id: createId(),
    name,
    groupId,
    expanded: options.expanded ?? false,
    sets: options.sets && options.sets.length > 0 ? options.sets : [createSet()],
  };
}

function buildDefaultSession(): SessionExercise[] {
  return [
    createExercise("Приседания", "legs", {
      expanded: true,
      sets: [createSet("40", "12"), createSet("45", "10"), createSet("45", "10")],
    }),
    createExercise("Жим лежа", "chest", { sets: [createSet("30", "12"), createSet("35", "10")] }),
    createExercise("Тяга верхнего блока", "back", { sets: [createSet("35", "12")] }),
    createExercise("Французский жим", "triceps", { sets: [createSet("18", "12")] }),
  ];
}

function loadSession(): SessionExercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultSession();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return buildDefaultSession();

    const normalized = parsed.map((item) => {
      const groupId =
        typeof item?.groupId === "string" && exerciseGroups.some((group) => group.id === item.groupId)
          ? item.groupId
          : exerciseGroups[0].id;

      const setItems = Array.isArray(item?.sets)
        ? item.sets.map((setItem: { weight?: unknown; reps?: unknown }) =>
            createSet(
              typeof setItem?.weight === "string" ? setItem.weight : String(setItem?.weight ?? ""),
              typeof setItem?.reps === "string" ? setItem.reps : String(setItem?.reps ?? ""),
            ),
          )
        : [];

      return createExercise(
        typeof item?.name === "string" && item.name.trim().length > 0 ? item.name.trim().slice(0, 80) : "Упражнение",
        groupId,
        {
          expanded: Boolean(item?.expanded),
          sets: setItems.length > 0 ? setItems : [createSet()],
        },
      );
    });

    return normalized.length > 0 ? normalized : buildDefaultSession();
  } catch {
    return buildDefaultSession();
  }
}

function formatDateKey(date: Date): string {
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

function buildWeekDays(locale: string): DayChip[] {
  const start = getWeekStart(new Date());
  const labelFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fullFormatter = new Intl.DateTimeFormat(locale, { weekday: "long", day: "2-digit", month: "long" });
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: formatDateKey(date),
      label: labelFormatter.format(date).replace(".", "").toUpperCase(),
      day: date.getDate(),
      fullLabel: fullFormatter.format(date),
      isToday: formatDateKey(date) === todayKey,
    };
  });
}

function findGroup(groupId: string): ExerciseGroup {
  return exerciseGroups.find((group) => group.id === groupId) ?? exerciseGroups[0];
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const locale = tg?.initDataUnsafe?.user?.language_code || "ru-RU";
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "спортсмен";

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(() => loadSession());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(exerciseGroups[0].id);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const isDark = tg?.colorScheme === "dark";

  const weekDays = useMemo(() => buildWeekDays(locale), [locale]);
  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[0];
  const activeGroup = useMemo(
    () => exerciseGroups.find((group) => group.id === activeGroupId) ?? exerciseGroups[0],
    [activeGroupId],
  );
  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    if (!query) return activeGroup.exercises;
    return activeGroup.exercises.filter((exerciseName) => exerciseName.toLowerCase().includes(query));
  }, [activeGroup, exerciseSearch]);
  const personalRecords = useMemo(() => {
    const records = new Map<string, number>();

    sessionExercises.forEach((exercise) => {
      const maxWeight = exercise.sets.reduce((max, setItem) => {
        const weight = Number(setItem.weight);
        if (!Number.isFinite(weight)) return max;
        return Math.max(max, weight);
      }, 0);

      const prevMax = records.get(exercise.name) ?? 0;
      records.set(exercise.name, Math.max(prevMax, maxWeight));
    });

    return records;
  }, [sessionExercises]);

  const legsPlanCount = useMemo(
    () => sessionExercises.filter((exercise) => exercise.groupId === "legs").reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [sessionExercises],
  );

  const upperPlanCount = useMemo(
    () =>
      sessionExercises
        .filter((exercise) => ["shoulders", "back", "chest", "triceps"].includes(exercise.groupId))
        .reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [sessionExercises],
  );

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionExercises));
  }, [sessionExercises]);

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
          setNotice("Отдых завершен. Готово к следующему подходу.");
          tg?.HapticFeedback?.impactOccurred?.("medium");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [restSeconds, tg]);

  function toggleExercise(exerciseId: string) {
    setSessionExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, expanded: !exercise.expanded } : exercise,
      ),
    );
  }

  function updateSetValue(exerciseId: string, setId: string, field: "weight" | "reps", value: string) {
    const sanitized = sanitizeNumber(value, field === "weight" ? 3 : 2);

    setSessionExercises((prev) =>
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
    setSessionExercises((prev) =>
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
    setSessionExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId));
    setNotice("Упражнение удалено");
    tg?.HapticFeedback?.impactOccurred?.("light");
  }

  function addExerciseToSession(name: string, groupId: string) {
    let duplicate = false;

    setSessionExercises((prev) => {
      const exists = prev.some((exercise) => exercise.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        duplicate = true;
        return prev.map((exercise) =>
          exercise.name.toLowerCase() === name.toLowerCase() ? { ...exercise, expanded: true } : exercise,
        );
      }

      return [...prev, createExercise(name, groupId, { expanded: true })];
    });

    if (duplicate) {
      setNotice("Это упражнение уже есть в списке");
      tg?.HapticFeedback?.impactOccurred?.("light");
      return;
    }

    setSheetOpen(false);
    setExerciseSearch("");
    setNotice(`Добавлено: ${name}`);
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

        <section className="week-strip" aria-label="Календарь недели">
          {weekDays.map((day, index) => (
            <button
              key={day.key}
              type="button"
              className={`day-chip ${selectedDayIndex === index ? "is-active" : ""} ${day.isToday ? "is-today" : ""}`}
              onClick={() => setSelectedDayIndex(index)}
            >
              <span className="day-label">{day.label}</span>
              <span className="day-number">{day.day}</span>
            </button>
          ))}
        </section>

        <p className="selected-day">План на {selectedDay.fullLabel}</p>

        <section className="program-stack" aria-label="Блоки тренировок">
          <article
            className="program-card legs"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(49, 215, 190, 0.9), rgba(78, 177, 255, 0.9)), url(${PROGRAM_IMAGES.legs})`,
            }}
          >
            <div>
              <p className="program-name">День ног</p>
              <p className="program-note">Силовой фокус: ягодицы, квадрицепс, задняя цепь</p>
            </div>
            <span className="program-count">{Math.max(legsPlanCount, 1)}</span>
          </article>

          <article
            className="program-card upper"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(249, 81, 160, 0.9), rgba(255, 118, 97, 0.9)), url(${PROGRAM_IMAGES.upper})`,
            }}
          >
            <div>
              <p className="program-name">Верх тела</p>
              <p className="program-note">Плечи, спина, грудь и трицепс</p>
            </div>
            <span className="program-count">{Math.max(upperPlanCount, 1)}</span>
          </article>
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

        <section className="exercise-board" aria-label="Упражнения">
          {sessionExercises.length === 0 ? (
            <p className="exercise-empty">Добавь первое упражнение кнопкой внизу.</p>
          ) : (
            sessionExercises.map((exercise) => {
              const group = findGroup(exercise.groupId);
              const prWeight = personalRecords.get(exercise.name) ?? 0;

              return (
                <article key={exercise.id} className={`exercise-card ${exercise.expanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="exercise-head"
                    onClick={() => toggleExercise(exercise.id)}
                    aria-expanded={exercise.expanded}
                  >
                    <span className="exercise-thumb" aria-hidden="true">
                      <img src={group.coverImage} alt="" loading="lazy" />
                      <span className="exercise-icon">{group.icon}</span>
                    </span>
                    <span className="exercise-text">
                      <strong>{exercise.name}</strong>
                      <small>{group.title}</small>
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

        <footer className="bottom-dock">
          <button type="button" className="dock-side-btn" onClick={() => setSheetOpen(true)} aria-label="Открыть каталог">
            …
          </button>
          <button type="button" className="dock-main-btn" onClick={() => setSheetOpen(true)}>
            Добавить
          </button>
        </footer>
      </main>

      {sheetOpen ? (
        <div className="sheet-overlay" role="presentation" onClick={() => setSheetOpen(false)}>
          <aside className="sheet" aria-label="Каталог упражнений" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <h2>Добавить упражнение</h2>
              <button type="button" onClick={() => setSheetOpen(false)}>
                Закрыть
              </button>
            </div>

            <div className="sheet-tabs" role="tablist" aria-label="Группы мышц">
              {exerciseGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`sheet-tab ${group.id === activeGroup.id ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setExerciseSearch("");
                  }}
                  aria-pressed={group.id === activeGroup.id}
                >
                  {group.title}
                </button>
              ))}
            </div>

            <label className="sheet-search">
              <span>Поиск упражнения</span>
              <input
                type="text"
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
                placeholder="Например: жим, тяга, присед"
              />
            </label>

            <ul className="sheet-list">
              {filteredExercises.length === 0 ? (
                <li className="sheet-empty">Ничего не найдено. Попробуй другой запрос.</li>
              ) : (
                filteredExercises.map((exerciseName) => (
                <li key={exerciseName}>
                  <button
                    type="button"
                    className="sheet-item-btn"
                    onClick={() => addExerciseToSession(exerciseName, activeGroup.id)}
                  >
                    <span className="sheet-item-left">
                      <img className="sheet-item-image" src={activeGroup.coverImage} alt="" loading="lazy" />
                      <span className="sheet-item-copy">
                        <strong>{exerciseName}</strong>
                        <small>{activeGroup.title}</small>
                      </span>
                    </span>
                    <span>＋</span>
                  </button>
                </li>
                ))
              )}
            </ul>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
