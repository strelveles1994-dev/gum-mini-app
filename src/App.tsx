
import { useEffect, useMemo, useRef, useState } from "react";
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
  photo_url?: string;
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

type DayPlanId = "upper" | "lower" | "fullbody" | "cardio" | "custom";
type CustomLibraryFilter = "all" | BasePlanId;
type AppScreen = "home" | "workout" | "progress";
type IconName = DayPlanId | "home" | "progress" | "add" | "core";
type MeasurementIconName = "date" | "height" | "weight" | "waist";

type DayPlan = {
  id: DayPlanId;
  title: string;
  subtitle: string;
  icon: IconName;
  image: string;
};

type DropSet = {
  id: string;
  weight: string;
  reps: string;
};

type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  speed: string;
  dropSets: DropSet[];
};

type SessionExercise = {
  id: string;
  name: string;
  note: string;
  expanded: boolean;
  sets: WorkoutSet[];
};

type SessionByPlan = Record<DayPlanId, SessionExercise[]>;
type SelectedExerciseByPlan = Record<DayPlanId, string>;
type SetField = "weight" | "reps" | "speed";
type DropSetField = "weight" | "reps";

type CalendarDay = {
  key: string;
  weekday: string;
  dayNumber: string;
  fullLabel: string;
  isToday: boolean;
};

type MonthCalendarDay = {
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

type MeasurementEntry = {
  id: string;
  date: string;
  height: string;
  weight: string;
  chest: string;
  waist: string;
  glutes: string;
  thighs: string;
  belly: string;
};

type ProfileState = {
  height: string;
  weight: string;
  chest: string;
  waist: string;
  glutes: string;
  thighs: string;
  belly: string;
  measurements: MeasurementEntry[];
};

type CustomProgram = {
  id: string;
  name: string;
  exercises: SessionExercise[];
};

type WorkoutLog = {
  id: string;
  dateKey: string;
  title: string;
};

const STORAGE_KEY = "gym-check-session-v7";
const PROFILE_STORAGE_KEY = "gym-check-profile-v3";
const CUSTOM_PROGRAMS_KEY = "gym-check-custom-programs-v1";
const WORKOUT_LOGS_KEY = "gym-check-workout-logs-v1";
const DEFAULT_REST_SECONDS = 90;

const customFilterOptions: { id: CustomLibraryFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "upper", label: "Верх" },
  { id: "lower", label: "Ноги" },
  { id: "core", label: "Пресс/кор" },
  { id: "cardio", label: "Кардио" },
];

const monthWeekLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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
    subtitle: "Ягодичные, квадрицепс, задняя поверхность бедра",
    icon: "lower",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "fullbody",
    title: "Все тело",
    subtitle: "Сбалансированная тренировка на основные группы",
    icon: "fullbody",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cardio",
    title: "День кардио",
    subtitle: "Выносливость и жиросжигание",
    icon: "cardio",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "custom",
    title: "Своя программа",
    subtitle: "Дай название и собери упражнения под себя",
    icon: "custom",
    image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80",
  },
];

const customLibrarySections: { id: BasePlanId; title: string; icon: IconName }[] = [
  { id: "upper", title: "Верх тела", icon: "upper" },
  { id: "lower", title: "Ноги и ягодицы", icon: "lower" },
  { id: "core", title: "Пресс и кор", icon: "core" },
  { id: "cardio", title: "Кардио", icon: "cardio" },
];

const exerciseDefinitionsByPlan: Record<BasePlanId, ExerciseDefinition[]> = {
  upper: exerciseCatalogByPlan.upper,
  lower: exerciseCatalogByPlan.lower,
  core: exerciseCatalogByPlan.core,
  cardio: exerciseCatalogByPlan.cardio,
};

const allLibraryExercises = Array.from(new Set(Object.values(baseExercisesByPlan).flat()));
const fullBodyLibraryExercises = Array.from(
  new Set([
    ...baseExercisesByPlan.upper.slice(0, 10),
    ...baseExercisesByPlan.lower.slice(0, 10),
    ...baseExercisesByPlan.core.slice(0, 6),
  ]),
);

const exercisesByPlan: Record<DayPlanId, string[]> = {
  ...baseExercisesByPlan,
  fullbody: fullBodyLibraryExercises,
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

function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function createDropSet(weight = "", reps = ""): DropSet {
  return {
    id: createId(),
    weight: sanitizeNumber(weight, 3),
    reps: sanitizeNumber(reps, 2),
  };
}

function createSet(weight = "", reps = "", dropSets?: DropSet[], speed = ""): WorkoutSet {
  return {
    id: createId(),
    weight: sanitizeNumber(weight, 3),
    reps: sanitizeNumber(reps, 3),
    speed: sanitizeNumber(speed, 3),
    dropSets: dropSets && dropSets.length > 0 ? dropSets : [],
  };
}

function createExercise(name: string, sets?: WorkoutSet[], note = ""): SessionExercise {
  return {
    id: createId(),
    name,
    note: note.slice(0, 140),
    expanded: false,
    sets: sets && sets.length > 0 ? sets : [createSet()],
  };
}

function buildDefaultSessionByPlan(): SessionByPlan {
  return {
    upper: [],
    lower: [],
    fullbody: [],
    cardio: [],
    custom: [],
  };
}
function normalizeExercises(input: unknown): SessionExercise[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((rawItem) => {
      const item = parseObject(rawItem);
      if (!item) return null;

      const rawName = typeof item.name === "string" ? item.name.trim().slice(0, 90) : "";
      if (!rawName) return null;

      const canonicalName = getExerciseDefinition(rawName)?.name ?? rawName;
      const rawSets = Array.isArray(item.sets) ? item.sets : [];

      const sets = rawSets
        .map((rawSet) => {
          const setObj = parseObject(rawSet);
          if (!setObj) return null;

          const rawDropSets = Array.isArray(setObj.dropSets) ? setObj.dropSets : [];
          const dropSets = rawDropSets
            .map((rawDrop) => {
              const dropObj = parseObject(rawDrop);
              if (!dropObj) return null;

              return createDropSet(
                typeof dropObj.weight === "string" ? dropObj.weight : String(dropObj.weight ?? ""),
                typeof dropObj.reps === "string" ? dropObj.reps : String(dropObj.reps ?? ""),
              );
            })
            .filter((dropSet): dropSet is DropSet => Boolean(dropSet));

          return createSet(
            typeof setObj.weight === "string" ? setObj.weight : String(setObj.weight ?? ""),
            typeof setObj.reps === "string" ? setObj.reps : String(setObj.reps ?? ""),
            dropSets,
            typeof setObj.speed === "string" ? setObj.speed : String(setObj.speed ?? ""),
          );
        })
        .filter((setItem): setItem is WorkoutSet => Boolean(setItem));

      return {
        id: createId(),
        name: canonicalName,
        note: typeof item.note === "string" ? item.note.slice(0, 140) : "",
        expanded: Boolean(item.expanded),
        sets: sets.length > 0 ? sets : [createSet()],
      };
    })
    .filter((exercise): exercise is SessionExercise => Boolean(exercise));
}

function loadSessionByPlan(): SessionByPlan {
  const fallback = buildDefaultSessionByPlan();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = parseObject(JSON.parse(raw));
    if (!parsed) return fallback;

    return {
      upper: normalizeExercises(parsed.upper),
      lower: normalizeExercises(parsed.lower),
      fullbody: normalizeExercises(parsed.fullbody),
      cardio: normalizeExercises(parsed.cardio),
      custom: normalizeExercises(parsed.custom),
    };
  } catch {
    return fallback;
  }
}

function buildDefaultProfile(): ProfileState {
  return {
    height: "",
    weight: "",
    chest: "",
    waist: "",
    glutes: "",
    thighs: "",
    belly: "",
    measurements: [],
  };
}

function loadProfileState(): ProfileState {
  const fallback = buildDefaultProfile();

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = parseObject(JSON.parse(raw));
    if (!parsed) return fallback;

    const rawMeasurements = Array.isArray(parsed.measurements) ? parsed.measurements : [];
    const measurements = rawMeasurements
      .map((rawItem) => {
        const item = parseObject(rawItem);
        if (!item) return null;

        const date = typeof item.date === "string" ? item.date.slice(0, 32) : "";
        if (!date) return null;

        return {
          id: createId(),
          date,
          height: sanitizeNumber(item.height, 3),
          weight: sanitizeNumber(item.weight, 3),
          chest: sanitizeNumber(item.chest, 3),
          waist: sanitizeNumber(item.waist, 3),
          glutes: sanitizeNumber(item.glutes ?? item.hips, 3),
          thighs: sanitizeNumber(item.thighs, 3),
          belly: sanitizeNumber(item.belly ?? item.fat, 3),
        };
      })
      .filter((entry): entry is MeasurementEntry => Boolean(entry));

    return {
      height: sanitizeNumber(parsed.height, 3),
      weight: sanitizeNumber(parsed.weight, 3),
      chest: sanitizeNumber(parsed.chest, 3),
      waist: sanitizeNumber(parsed.waist, 3),
      glutes: sanitizeNumber(parsed.glutes ?? parsed.hips, 3),
      thighs: sanitizeNumber(parsed.thighs, 3),
      belly: sanitizeNumber(parsed.belly ?? parsed.fat, 3),
      measurements,
    };
  } catch {
    return fallback;
  }
}

function loadCustomPrograms(): CustomProgram[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROGRAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((rawItem) => {
        const item = parseObject(rawItem);
        if (!item) return null;

        const name =
          typeof item.name === "string" && item.name.trim().length > 0
            ? item.name.trim().slice(0, 60)
            : "";
        if (!name) return null;

        return {
          id: typeof item.id === "string" && item.id ? item.id : createId(),
          name,
          exercises: normalizeExercises(item.exercises),
        } as CustomProgram;
      })
      .filter((program): program is CustomProgram => Boolean(program));
  } catch {
    return [];
  }
}

function loadWorkoutLogs(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(WORKOUT_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((rawItem) => {
        const item = parseObject(rawItem);
        if (!item) return null;
        const dateKey = typeof item.dateKey === "string" ? item.dateKey : "";
        if (!dateKey) return null;

        return {
          id: typeof item.id === "string" && item.id ? item.id : createId(),
          dateKey,
          title: typeof item.title === "string" ? item.title.slice(0, 80) : "Тренировка",
        } as WorkoutLog;
      })
      .filter((entry): entry is WorkoutLog => Boolean(entry));
  } catch {
    return [];
  }
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - day);
  return current;
}

function buildCalendarWeek(anchorDate: Date): CalendarDay[] {
  const start = getWeekStart(anchorDate);
  const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const fullFormatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const key = formatDateKey(date);
    const weekday = weekdayFormatter.format(date).replace(".", "").slice(0, 2);

    return {
      key,
      weekday,
      dayNumber: String(date.getDate()),
      fullLabel: fullFormatter.format(date),
      isToday: key === todayKey,
    };
  });
}

function buildMonthCalendar(anchorDate: Date): MonthCalendarDay[] {
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);

  const todayKey = formatDateKey(new Date());
  const currentMonth = anchorDate.getMonth();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: formatDateKey(date),
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === currentMonth,
      isToday: formatDateKey(date) === todayKey,
    };
  });
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMetric(value: string, suffix: string): string {
  return value ? `${value}${suffix}` : "--";
}

function AppIcon({ name, className }: { name: IconName; className?: string }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M4.8 10.4L12 4.8L19.2 10.4V18.8H14.6V14.6H9.4V18.8H4.8V10.4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "progress") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5.2 18.6V13.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 18.6V9.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M18.8 18.6V5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "add") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 5.4V18.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M5.4 12H18.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

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

  if (name === "fullbody") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="6.6" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8.8V14.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.7 11.2H15.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9.8 19.2L12 14.6L14.2 19.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === "core") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4.8C10.4 4.8 9.1 6.1 9.1 7.7V10.4H14.9V7.7C14.9 6.1 13.6 4.8 12 4.8Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.4 10.4H15.6V14.2H8.4V10.4Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 14.2H15V18.8H9V14.2Z" stroke="currentColor" strokeWidth="1.7" />
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

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4.7L13.8 9.2L18.4 11L13.8 12.8L12 17.3L10.2 12.8L5.6 11L10.2 9.2L12 4.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18.2 5.7L18.8 7.3L20.4 7.9L18.8 8.5L18.2 10.1L17.6 8.5L16 7.9L17.6 7.3L18.2 5.7Z" fill="currentColor" />
    </svg>
  );
}

function MeasurementIcon({ name, className }: { name: MeasurementIconName; className?: string }) {
  if (name === "date") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3.8" y="5.4" width="16.4" height="14.8" rx="3.1" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7.8 3.8V7.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16.2 3.8V7.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.8 10.1H20.2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  if (name === "weight") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="4.1" y="5.4" width="15.8" height="13.2" rx="3.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9.2L15.4 10.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="9.2" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (name === "height") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4.3V19.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9.5 6.5L12 4.3L14.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 17.5L12 19.7L14.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "waist") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M8.6 4.8C9.5 6.1 10.6 6.8 12 6.8C13.4 6.8 14.5 6.1 15.4 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 9.5C8 9.5 9.2 11 12 11C14.8 11 16 9.5 16 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6.8 19.2C7.8 16.4 9.3 14.8 12 14.8C14.7 14.8 16.2 16.4 17.2 19.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.6 4.8C9.5 6.1 10.6 6.8 12 6.8C13.4 6.8 14.5 6.1 15.4 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 9.5C8 9.5 9.2 11 12 11C14.8 11 16 9.5 16 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.8 19.2C7.8 16.4 9.3 14.8 12 14.8C14.7 14.8 16.2 16.4 17.2 19.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const userName = tg?.initDataUnsafe?.user?.first_name?.trim() || "Спортсмен";
  const userPhoto = tg?.initDataUnsafe?.user?.photo_url ?? "";
  const isDark = tg?.colorScheme === "dark";

  const [screen, setScreen] = useState<AppScreen>("home");
  const [selectedPlanId, setSelectedPlanId] = useState<DayPlanId>("upper");
  const [sessionByPlan, setSessionByPlan] = useState<SessionByPlan>(() => loadSessionByPlan());
  const [customPrograms, setCustomPrograms] = useState<CustomProgram[]>(() => loadCustomPrograms());
  const [selectedCustomProgramId, setSelectedCustomProgramId] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => loadWorkoutLogs());
  const [profile, setProfile] = useState<ProfileState>(() => loadProfileState());
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [isRestPanelOpen, setIsRestPanelOpen] = useState(false);
  const [pendingDeleteCustomProgramId, setPendingDeleteCustomProgramId] = useState<string | null>(null);
  const [restMinutesInput, setRestMinutesInput] = useState(() => String(Math.floor(DEFAULT_REST_SECONDS / 60)));
  const [restSecondsInput, setRestSecondsInput] = useState(() => String(DEFAULT_REST_SECONDS % 60).padStart(2, "0"));
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [customFilter, setCustomFilter] = useState<CustomLibraryFilter>("all");
  const [customWorkoutNameInput, setCustomWorkoutNameInput] = useState("");
  const [customExerciseInput, setCustomExerciseInput] = useState("");
  const [monthAnchor] = useState(() => new Date());
  const [isMeasurementsExpanded, setIsMeasurementsExpanded] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [expandedLibrarySections, setExpandedLibrarySections] = useState<BasePlanId[]>(() =>
    customLibrarySections.map((section) => section.id),
  );
  const [swipedPlanId, setSwipedPlanId] = useState<DayPlanId | null>(null);
  const [swipedCustomProgramId, setSwipedCustomProgramId] = useState<string | null>(null);
  const [swipedExerciseId, setSwipedExerciseId] = useState<string | null>(null);
  const planSwipeStartRef = useRef<{ planId: DayPlanId; x: number; y: number } | null>(null);
  const customSwipeStartRef = useRef<{ programId: string; x: number; y: number } | null>(null);
  const exerciseSwipeStartRef = useRef<{ exerciseId: string; x: number; y: number } | null>(null);
  const [selectedExerciseByPlan, setSelectedExerciseByPlan] = useState<SelectedExerciseByPlan>({
    upper: exercisesByPlan.upper[0] ?? "",
    lower: exercisesByPlan.lower[0] ?? "",
    fullbody: exercisesByPlan.fullbody[0] ?? "",
    cardio: exercisesByPlan.cardio[0] ?? "",
    custom: exercisesByPlan.custom[0] ?? "",
  });

  const effectiveCustomProgramId = selectedCustomProgramId ?? customPrograms[0]?.id ?? null;
  const selectedCustomProgram =
    effectiveCustomProgramId !== null
      ? customPrograms.find((program) => program.id === effectiveCustomProgramId) ?? null
      : null;

  const selectedPlan =
    selectedPlanId === "custom"
      ? {
          ...dayPlanById.custom,
          title: selectedCustomProgram?.name ?? "Своя программа",
          subtitle: "Индивидуальная тренировка",
        }
      : dayPlanById[selectedPlanId];

  const activeExercises =
    selectedPlanId === "custom" ? selectedCustomProgram?.exercises ?? [] : sessionByPlan[selectedPlanId];
  const isCardioWorkout = selectedPlanId === "cardio";
  const expandedExerciseId = activeExercises.find((exercise) => exercise.expanded)?.id ?? null;

  const allExercisesForProgress = useMemo(
    () => [
      ...Object.values(sessionByPlan).flat(),
      ...customPrograms.flatMap((program) => program.exercises),
    ],
    [sessionByPlan, customPrograms],
  );

  const weekDays = useMemo(() => buildCalendarWeek(new Date()), []);
  const monthDays = useMemo(() => buildMonthCalendar(monthAnchor), [monthAnchor]);
  const selectedCalendarDay = weekDays.find((day) => day.key === selectedDateKey) ?? weekDays[0] ?? null;
  const latestMeasurement = profile.measurements[0] ?? null;
  const summaryMeasurement = {
    date: latestMeasurement?.date ?? "--.--",
    height: latestMeasurement?.height || profile.height,
    weight: latestMeasurement?.weight || profile.weight,
    chest: latestMeasurement?.chest || profile.chest,
    waist: latestMeasurement?.waist || profile.waist,
    glutes: latestMeasurement?.glutes || profile.glutes,
    thighs: latestMeasurement?.thighs || profile.thighs,
    belly: latestMeasurement?.belly || profile.belly,
  };
  const workoutDateSet = useMemo(
    () => new Set(workoutLogs.map((entry) => entry.dateKey)),
    [workoutLogs],
  );
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(monthAnchor),
    [monthAnchor],
  );

  const normalizedCustomSearch = customSearch.trim().toLowerCase();
  const customExerciseNameSet = useMemo(
    () => new Set((selectedCustomProgram?.exercises ?? []).map((exercise) => exercise.name.toLowerCase())),
    [selectedCustomProgram],
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

  const plansWithWorkouts = useMemo(
    () => dayPlans.filter((plan) => plan.id !== "custom" && sessionByPlan[plan.id].length > 0),
    [sessionByPlan],
  );

  const setCountsByPlan = useMemo(
    () =>
      dayPlans.reduce(
        (acc, plan) => {
          if (plan.id === "custom") {
            acc[plan.id] = customPrograms.reduce(
              (sumPrograms, program) =>
                sumPrograms + program.exercises.reduce((sumSets, exercise) => sumSets + exercise.sets.length, 0),
              0,
            );
            return acc;
          }

          acc[plan.id] = sessionByPlan[plan.id].reduce((sum, exercise) => sum + exercise.sets.length, 0);
          return acc;
        },
        {} as Record<DayPlanId, number>,
      ),
    [sessionByPlan, customPrograms],
  );

  const personalRecords = useMemo(() => {
    const records = new Map<string, number>();

    allExercisesForProgress
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
  }, [allExercisesForProgress]);

  const topExercises = useMemo(() => {
    const counts = new Map<string, number>();

    allExercisesForProgress.forEach((exercise) => {
      counts.set(exercise.name, (counts.get(exercise.name) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [allExercisesForProgress]);

  const workoutStats = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let week = 0;
    let month = 0;

    workoutLogs.forEach((entry) => {
      const date = new Date(`${entry.dateKey}T00:00:00`);
      if (date >= weekStart) week += 1;
      if (date >= monthStart) month += 1;
    });

    return {
      week,
      month,
      total: workoutLogs.length,
    };
  }, [workoutLogs]);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionByPlan));
  }, [sessionByPlan]);

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_PROGRAMS_KEY, JSON.stringify(customPrograms));
  }, [customPrograms]);

  useEffect(() => {
    localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  useEffect(() => {
    if (!notice) return;
    const timerId = window.setTimeout(() => setNotice(""), 2300);
    return () => window.clearTimeout(timerId);
  }, [notice]);

  useEffect(() => {
    if (restSeconds === null) return;

    const timerId = window.setTimeout(() => {
      setRestSeconds((current) => {
        if (current === null) return null;

        if (current <= 1) {
          tg?.HapticFeedback?.impactOccurred?.("medium");
          setNotice("Отдых завершен. Переходи к следующему подходу.");
          return null;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [restSeconds, tg]);

  useEffect(() => {
    setSwipedExerciseId(null);
  }, [selectedPlanId, selectedCustomProgramId, screen]);

  function triggerImpact(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light") {
    tg?.HapticFeedback?.impactOccurred?.(style);
  }

  function updateExercisesForPlan(planId: DayPlanId, updater: (prev: SessionExercise[]) => SessionExercise[]) {
    if (planId === "custom") {
      if (!effectiveCustomProgramId) return;

      setCustomPrograms((prev) =>
        prev.map((program) =>
          program.id === effectiveCustomProgramId ? { ...program, exercises: updater(program.exercises) } : program,
        ),
      );
      return;
    }

    setSessionByPlan((prev) => ({
      ...prev,
      [planId]: updater(prev[planId]),
    }));
  }

  function openWorkout(planId: DayPlanId, options?: { customProgramId?: string; logEvent?: boolean }) {
    setSelectedPlanId(planId);
    setPendingDeleteCustomProgramId(null);
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    if (planId === "custom") {
      const targetCustomId =
        options?.customProgramId ?? effectiveCustomProgramId ?? customPrograms[0]?.id ?? null;
      setSelectedCustomProgramId(targetCustomId);
      const targetProgram = customPrograms.find((program) => program.id === targetCustomId);
      setCustomWorkoutNameInput(targetProgram?.name ?? "");
    }
    setScreen("workout");
    setIsCreateWorkoutOpen(false);
    closeWorkoutDrawers();

    if (options?.logEvent) {
      const dateKey = formatDateKey(new Date());
      const title =
        planId === "custom"
          ? customPrograms.find((program) => program.id === (options.customProgramId ?? effectiveCustomProgramId))
              ?.name ?? "Своя программа"
          : dayPlanById[planId].title;

      setWorkoutLogs((prev) => [
        ...prev,
        {
          id: createId(),
          dateKey,
          title,
        },
      ]);
    }
  }

  function goHome() {
    setScreen("home");
    setPendingDeleteCustomProgramId(null);
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    setIsCreateWorkoutOpen(false);
    closeWorkoutDrawers();
  }

  function openProgress() {
    setScreen("progress");
    setPendingDeleteCustomProgramId(null);
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    setIsCreateWorkoutOpen(false);
    closeWorkoutDrawers();
  }

  function createCustomProgram() {
    const trimmed = customWorkoutNameInput.trim();
    const defaultName = `Моя программа ${customPrograms.length + 1}`;
    const name = (trimmed || defaultName).slice(0, 60);

    const program: CustomProgram = {
      id: createId(),
      name,
      exercises: [],
    };

    setCustomPrograms((prev) => [...prev, program]);
    setCustomWorkoutNameInput(program.name);
    setSelectedCustomProgramId(program.id);
    setSelectedPlanId("custom");
    setPendingDeleteCustomProgramId(null);
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    setScreen("workout");
    setIsCreateWorkoutOpen(false);
    setIsCustomBuilderOpen(true);
    setNotice(`Создана программа: ${name}`);
  }

  function renameSelectedCustomProgram(name: string) {
    if (!effectiveCustomProgramId) return;
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;

    setCustomPrograms((prev) =>
      prev.map((program) =>
        program.id === effectiveCustomProgramId ? { ...program, name: trimmed } : program,
      ),
    );
  }

  function addManualCustomExercise() {
    if (selectedPlanId !== "custom") return;
    const name = customExerciseInput.trim().slice(0, 80);
    if (!name) {
      setNotice("Введи название упражнения");
      return;
    }

    addExerciseToPlan("custom", name, { allowDuplicate: true });
    setCustomExerciseInput("");
  }

  function addExerciseToPlan(
    planId: DayPlanId,
    exerciseName: string,
    options: { allowDuplicate?: boolean } = {},
  ) {
    if (planId === "custom" && !effectiveCustomProgramId) {
      setNotice("Сначала создай свою программу");
      return;
    }

    const normalizedName = (getExerciseDefinition(exerciseName)?.name ?? exerciseName).trim();
    if (!normalizedName) return;
    const allowDuplicate = Boolean(options.allowDuplicate);

    let added = false;

    updateExercisesForPlan(planId, (prev) => {
      if (!allowDuplicate) {
        const alreadyExists = prev.some((exercise) => exercise.name.toLowerCase() === normalizedName.toLowerCase());
        if (alreadyExists) return prev;
      }

      added = true;
      return [...prev, createExercise(normalizedName)];
    });

    if (added) {
      if (planId === "custom") {
        setPendingDeleteCustomProgramId(null);
      }
      setNotice(`Добавлено: ${normalizedName}`);
      triggerImpact("light");
    } else {
      setNotice("Это упражнение уже есть в списке");
    }
  }

  function addExerciseFromDropdown() {
    const exerciseName = selectedExerciseByPlan[selectedPlanId];
    if (!exerciseName) {
      setNotice("Выбери упражнение");
      return;
    }

    addExerciseToPlan(selectedPlanId, exerciseName, { allowDuplicate: true });
  }

  function toggleExerciseInCustomProgram(exerciseName: string) {
    const normalizedName = (getExerciseDefinition(exerciseName)?.name ?? exerciseName).trim();
    if (!normalizedName) return;

    let removed = false;

    updateExercisesForPlan("custom", (prev) => {
      const hasExercise = prev.some((exercise) => exercise.name.toLowerCase() === normalizedName.toLowerCase());
      if (!hasExercise) return [...prev, createExercise(normalizedName)];

      removed = true;
      return prev.filter((exercise) => exercise.name.toLowerCase() !== normalizedName.toLowerCase());
    });

    setPendingDeleteCustomProgramId(null);
    setNotice(removed ? `Убрано: ${normalizedName}` : `Добавлено: ${normalizedName}`);
    triggerImpact("soft");
  }

  function toggleLibrarySection(sectionId: BasePlanId) {
    setExpandedLibrarySections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  }

  function toggleExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id === exerciseId) {
          return { ...exercise, expanded: !exercise.expanded };
        }

        if (!exercise.expanded) return exercise;
        return { ...exercise, expanded: false };
      }),
    );
  }

  function updateExerciseNote(exerciseId: string, note: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, note: note.slice(0, 140) } : exercise,
      ),
    );
  }

  function removeExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) => prev.filter((exercise) => exercise.id !== exerciseId));
    setSwipedExerciseId(null);
    setNotice("Упражнение удалено");
    triggerImpact("soft");
  }

  function updateSetValue(exerciseId: string, setId: string, field: SetField, value: string) {
    const sanitized = sanitizeNumber(value, 3);

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
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, createSet()] } : exercise,
      ),
    );
  }

  function removeSet(exerciseId: string, setId: string) {
    let removed = false;

    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        if (exercise.sets.length <= 1) return exercise;

        removed = true;
        return {
          ...exercise,
          sets: exercise.sets.filter((setItem) => setItem.id !== setId),
        };
      }),
    );

    if (removed) {
      triggerImpact("soft");
    } else {
      setNotice("Нужен минимум один подход");
    }
  }

  function addDropSet(exerciseId: string, setId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) => {
            if (setItem.id !== setId) return setItem;

            const previous = setItem.dropSets[setItem.dropSets.length - 1];
            const weight = previous?.weight ?? setItem.weight;
            const reps = previous?.reps ?? setItem.reps;

            return {
              ...setItem,
              dropSets: [...setItem.dropSets, createDropSet(weight, reps)],
            };
          }),
        };
      }),
    );

    triggerImpact("light");
  }

  function updateDropSetValue(
    exerciseId: string,
    setId: string,
    dropSetId: string,
    field: DropSetField,
    value: string,
  ) {
    const sanitized = sanitizeNumber(value, field === "weight" ? 3 : 2);

    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) => {
            if (setItem.id !== setId) return setItem;

            return {
              ...setItem,
              dropSets: setItem.dropSets.map((dropSet) =>
                dropSet.id === dropSetId ? { ...dropSet, [field]: sanitized } : dropSet,
              ),
            };
          }),
        };
      }),
    );
  }

  function removeDropSet(exerciseId: string, setId: string, dropSetId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) => {
            if (setItem.id !== setId) return setItem;

            return {
              ...setItem,
              dropSets: setItem.dropSets.filter((dropSet) => dropSet.id !== dropSetId),
            };
          }),
        };
      }),
    );

    triggerImpact("soft");
  }

  function clearCurrentPlan() {
    if (selectedPlanId === "custom" && selectedCustomProgram && selectedCustomProgram.exercises.length > 0) {
      setPendingDeleteCustomProgramId(selectedCustomProgram.id);
    } else {
      setPendingDeleteCustomProgramId(null);
    }

    updateExercisesForPlan(selectedPlanId, () => []);
    setNotice("Тренировка очищена");
    triggerImpact("rigid");
  }

  function closeWorkoutDrawers() {
    setIsExercisePickerOpen(false);
    setIsCustomBuilderOpen(false);
    setIsRestPanelOpen(false);
    setRestSeconds(null);
  }

  function saveWorkoutSetup() {
    const shouldDeleteEmptyCustom =
      selectedPlanId === "custom" &&
      selectedCustomProgram !== null &&
      pendingDeleteCustomProgramId === selectedCustomProgram.id &&
      selectedCustomProgram.exercises.length === 0;

    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) => (exercise.expanded ? { ...exercise, expanded: false } : exercise)),
    );

    if (shouldDeleteEmptyCustom && selectedCustomProgram) {
      setCustomPrograms((prev) => prev.filter((program) => program.id !== selectedCustomProgram.id));
      setSelectedCustomProgramId(null);
      setSelectedPlanId("upper");
      setScreen("home");
      setPendingDeleteCustomProgramId(null);
      closeWorkoutDrawers();
      setNotice("Пустая программа удалена");
      triggerImpact("medium");
      return;
    }

    setPendingDeleteCustomProgramId(null);
    closeWorkoutDrawers();
    setNotice("Программа сохранена");
    triggerImpact("medium");
  }

  function confirmExerciseSetsSaved() {
    setNotice("Подходы и повторения сохранены");
    triggerImpact("light");
  }

  function startPlanSwipe(planId: DayPlanId, clientX: number, clientY: number) {
    planSwipeStartRef.current = { planId, x: clientX, y: clientY };
  }

  function movePlanSwipe(planId: DayPlanId, clientX: number, clientY: number) {
    const swipe = planSwipeStartRef.current;
    if (!swipe || swipe.planId !== planId) return;

    const deltaX = clientX - swipe.x;
    const deltaY = clientY - swipe.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 6) return;

    if (deltaX <= -36) {
      setSwipedPlanId(planId);
      setSwipedCustomProgramId(null);
      setSwipedExerciseId(null);
      return;
    }

    if (deltaX >= 20 && swipedPlanId === planId) {
      setSwipedPlanId(null);
    }
  }

  function endPlanSwipe(planId: DayPlanId) {
    if (planSwipeStartRef.current?.planId === planId) {
      planSwipeStartRef.current = null;
    }
  }

  function startCustomProgramSwipe(programId: string, clientX: number, clientY: number) {
    customSwipeStartRef.current = { programId, x: clientX, y: clientY };
  }

  function moveCustomProgramSwipe(programId: string, clientX: number, clientY: number) {
    const swipe = customSwipeStartRef.current;
    if (!swipe || swipe.programId !== programId) return;

    const deltaX = clientX - swipe.x;
    const deltaY = clientY - swipe.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 6) return;

    if (deltaX <= -36) {
      setSwipedCustomProgramId(programId);
      setSwipedPlanId(null);
      setSwipedExerciseId(null);
      return;
    }

    if (deltaX >= 20 && swipedCustomProgramId === programId) {
      setSwipedCustomProgramId(null);
    }
  }

  function endCustomProgramSwipe(programId: string) {
    if (customSwipeStartRef.current?.programId === programId) {
      customSwipeStartRef.current = null;
    }
  }

  function startExerciseSwipe(exerciseId: string, clientX: number, clientY: number) {
    exerciseSwipeStartRef.current = { exerciseId, x: clientX, y: clientY };
  }

  function moveExerciseSwipe(exerciseId: string, clientX: number, clientY: number) {
    const swipe = exerciseSwipeStartRef.current;
    if (!swipe || swipe.exerciseId !== exerciseId) return;

    const deltaX = clientX - swipe.x;
    const deltaY = clientY - swipe.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 6) return;

    if (deltaX <= -32) {
      setSwipedExerciseId(exerciseId);
      setSwipedPlanId(null);
      setSwipedCustomProgramId(null);
      return;
    }

    if (deltaX >= 18 && swipedExerciseId === exerciseId) {
      setSwipedExerciseId(null);
    }
  }

  function endExerciseSwipe(exerciseId: string) {
    if (exerciseSwipeStartRef.current?.exerciseId === exerciseId) {
      exerciseSwipeStartRef.current = null;
    }
  }

  function deleteCustomProgram(programId: string) {
    const target = customPrograms.find((program) => program.id === programId);
    if (!target) return;

    setCustomPrograms((prev) => prev.filter((program) => program.id !== programId));
    if (selectedCustomProgramId === programId) {
      setSelectedCustomProgramId(null);
      if (selectedPlanId === "custom") {
        setSelectedPlanId("upper");
      }
    }
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    setPendingDeleteCustomProgramId(null);
    setNotice(`Удалена программа: ${target.name}`);
    triggerImpact("soft");
  }

  function deletePlanWorkout(planId: DayPlanId) {
    if (planId === "custom") return;

    const planTitle = dayPlanById[planId].title;
    updateExercisesForPlan(planId, () => []);
    setSwipedPlanId(null);
    setSwipedCustomProgramId(null);
    setSwipedExerciseId(null);
    setNotice(`Удалена тренировка: ${planTitle}`);
    triggerImpact("soft");
  }

  function startRestTimer() {
    const minutes = Number(restMinutesInput || "0");
    const seconds = Number(restSecondsInput || "0");

    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(99, Math.floor(minutes))) : 0;
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.min(59, Math.floor(seconds))) : 0;
    const total = safeMinutes * 60 + safeSeconds;

    if (total <= 0) {
      setNotice("Укажи время отдыха");
      return;
    }

    setRestMinutesInput(String(safeMinutes));
    setRestSecondsInput(String(safeSeconds).padStart(2, "0"));
    setRestSeconds(total);
    setIsRestPanelOpen(true);
    triggerImpact("light");
  }

  function stopRestTimer() {
    setRestSeconds(null);
  }

  function updateProfileField(field: keyof Omit<ProfileState, "measurements">, value: string) {
    setProfile((prev) => ({
      ...prev,
      [field]: sanitizeNumber(value, 3),
    }));
  }

  function addMeasurement() {
    if (
      !profile.height &&
      !profile.weight &&
      !profile.chest &&
      !profile.waist &&
      !profile.glutes &&
      !profile.thighs &&
      !profile.belly
    ) {
      setNotice("Заполни хотя бы один параметр замера");
      return;
    }

    const date = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    const entry: MeasurementEntry = {
      id: createId(),
      date,
      height: profile.height,
      weight: profile.weight,
      chest: profile.chest,
      waist: profile.waist,
      glutes: profile.glutes,
      thighs: profile.thighs,
      belly: profile.belly,
    };

    setProfile((prev) => ({
      ...prev,
      measurements: [entry, ...prev.measurements].slice(0, 40),
    }));

    setNotice("Замер сохранен");
    triggerImpact("medium");
  }

  function removeMeasurement(entryId: string) {
    setProfile((prev) => ({
      ...prev,
      measurements: prev.measurements.filter((entry) => entry.id !== entryId),
    }));
  }

  return (
    <div className={`app-shell ${isDark ? "theme-dark" : "theme-light"}`}>
      <main className="app-frame">
        {screen === "home" ? (
          <>
            <header className="screen-head">
              <div className="head-copy">
                <p className="screen-kicker">Gym Check</p>
                <h1 className="screen-title">Тренировки</h1>
                <p className="screen-subtitle">Привет, {userName}</p>
              </div>

              <button type="button" className="avatar-btn" onClick={openProgress} aria-label="Открыть прогресс">
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="avatar-img" />
                ) : (
                  <AppIcon name="progress" className="app-icon app-icon-md" />
                )}
              </button>
            </header>

            <section className="home-calendar">
              <div className="home-calendar-head">
                <p className="section-title">Календарь</p>
                <p className="home-calendar-month">{monthLabel}</p>
              </div>

              <div className="home-calendar-week">
                {monthWeekLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="home-calendar-grid">
                {monthDays.map((day) => {
                  const hasWorkout = workoutDateSet.has(day.key);

                  return (
                    <div
                      key={day.key}
                      className={`home-calendar-day ${day.inCurrentMonth ? "" : "is-muted"} ${
                        day.isToday ? "is-today" : ""
                      } ${hasWorkout ? "has-workout" : ""}`}
                    >
                      <span>{day.dayNumber}</span>
                      {hasWorkout ? <i aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="measurements-card">
              <div className="measurements-head">
                <p className="measurements-title">Замеры</p>
                <button
                  type="button"
                  className="measurements-add-btn"
                  onClick={addMeasurement}
                  aria-label="Добавить замер"
                >
                  <AppIcon name="add" className="app-icon app-icon-sm" />
                </button>
              </div>

              <div className="measurements-summary" role="list" aria-label="Последний замер">
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="date" className="measurement-item-icon" />
                  <span className="measurement-item-value">{summaryMeasurement.date}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="height" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.height, " см")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="weight" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.weight, " кг")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="waist" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.waist, " см")}</span>
                </div>
              </div>

              <button
                type="button"
                className={`measurements-toggle ${isMeasurementsExpanded ? "is-open" : ""}`}
                onClick={() => setIsMeasurementsExpanded((prev) => !prev)}
                aria-expanded={isMeasurementsExpanded}
                aria-label={isMeasurementsExpanded ? "Скрыть подробности замеров" : "Показать подробности замеров"}
              >
                <span className="measurements-toggle-arrow" aria-hidden="true">
                  ▾
                </span>
              </button>

              {isMeasurementsExpanded ? (
                <div className="measurements-details action-drawer">
                  <div className="measurement-inputs-grid">
                    <label>
                      <span>Рост</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.height}
                        placeholder="см"
                        onChange={(event) => updateProfileField("height", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Вес</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.weight}
                        placeholder="кг"
                        onChange={(event) => updateProfileField("weight", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Грудь</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.chest}
                        placeholder="см"
                        onChange={(event) => updateProfileField("chest", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Талия</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.waist}
                        placeholder="см"
                        onChange={(event) => updateProfileField("waist", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Ягодицы</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.glutes}
                        placeholder="см"
                        onChange={(event) => updateProfileField("glutes", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Бедра</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.thighs}
                        placeholder="см"
                        onChange={(event) => updateProfileField("thighs", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Живот</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={profile.belly}
                        placeholder="см"
                        onChange={(event) => updateProfileField("belly", event.target.value)}
                      />
                    </label>
                  </div>

                  <button type="button" className="secondary-btn" onClick={addMeasurement}>
                    Сохранить замер
                  </button>

                  <div className="measurement-list">
                    {profile.measurements.length === 0 ? (
                      <p className="empty-state">История замеров пока пустая.</p>
                    ) : (
                      profile.measurements.map((entry) => (
                        <article key={entry.id} className="measurement-row">
                          <div className="measurement-date">{entry.date}</div>
                          <div className="measurement-values measurement-values-extended">
                            <span>Рост: {formatMetric(entry.height, " см")}</span>
                            <span>Вес: {formatMetric(entry.weight, " кг")}</span>
                            <span>Грудь: {formatMetric(entry.chest, " см")}</span>
                            <span>Талия: {formatMetric(entry.waist, " см")}</span>
                            <span>Ягодицы: {formatMetric(entry.glutes, " см")}</span>
                            <span>Бедра: {formatMetric(entry.thighs, " см")}</span>
                            <span>Живот: {formatMetric(entry.belly, " см")}</span>
                          </div>
                          <button type="button" className="ghost-btn" onClick={() => removeMeasurement(entry.id)}>
                            Удалить
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="home-card">
              <p className="home-card-title">Начни новую тренировку</p>
              <p className="home-card-subtitle">На старте все пусто. Нажми кнопку, выбери день и добавь упражнения.</p>

              <button
                type="button"
                className={`primary-btn ${isCreateWorkoutOpen ? "is-open" : ""}`}
                onClick={() => setIsCreateWorkoutOpen((prev) => !prev)}
              >
                <AppIcon name="add" className="app-icon app-icon-sm" />
                <span className="primary-btn-label">{isCreateWorkoutOpen ? "Скрыть список" : "Добавить тренировку"}</span>
                <span className={`primary-btn-chevron ${isCreateWorkoutOpen ? "is-open" : ""}`} aria-hidden="true">
                  ▾
                </span>
              </button>

              {isCreateWorkoutOpen ? (
                <div className="plan-picker action-drawer" aria-label="Выбрать тренировочный день">
                  {dayPlans
                    .filter((plan) => plan.id !== "custom")
                    .map((plan) => {
                    const exerciseCount = sessionByPlan[plan.id].length;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        className="plan-option"
                        onClick={() => openWorkout(plan.id, { logEvent: true })}
                      >
                        <span className="plan-option-icon" aria-hidden="true">
                          <AppIcon name={plan.icon} className="app-icon app-icon-sm" />
                        </span>
                        <span className="plan-option-copy">
                          <strong>{plan.title}</strong>
                          <small>{plan.subtitle}</small>
                        </span>
                        <span className="plan-option-count">{exerciseCount}</span>
                      </button>
                    );
                  })}

                  <div className="custom-programs-head">
                    <span>Свои программы</span>
                    <button type="button" className="mini-plus-btn" onClick={createCustomProgram} aria-label="Создать программу">
                      +
                    </button>
                  </div>

                  {customPrograms.length === 0 ? (
                    <p className="empty-state">Добавь свою программу через +</p>
                  ) : (
                    customPrograms.map((program) => (
                      <button
                        key={program.id}
                        type="button"
                        className="plan-option"
                        onClick={() => openWorkout("custom", { customProgramId: program.id, logEvent: true })}
                      >
                        <span className="plan-option-icon" aria-hidden="true">
                          <AppIcon name="custom" className="app-icon app-icon-sm" />
                        </span>
                        <span className="plan-option-copy">
                          <strong>{program.name}</strong>
                          <small>Собственная программа</small>
                        </span>
                        <span className="plan-option-count">{program.exercises.length}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </section>

            <section className="saved-workouts">
              <div className="section-head">
                <p className="section-title">Мои тренировки</p>
              </div>

              {plansWithWorkouts.length === 0 && customPrograms.length === 0 ? (
                <p className="empty-state">Пока пусто. Добавь первую тренировку через кнопку выше.</p>
              ) : (
                <div className="saved-list">
                  {plansWithWorkouts.map((plan) => (
                    <div key={plan.id} className={`custom-swipe-row ${swipedPlanId === plan.id ? "is-open" : ""}`}>
                      <button type="button" className="custom-swipe-delete-btn" onClick={() => deletePlanWorkout(plan.id)}>
                        Удалить
                      </button>

                      <article
                        className="saved-card custom-swipe-card"
                        onTouchStart={(event) =>
                          startPlanSwipe(plan.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchMove={(event) =>
                          movePlanSwipe(plan.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchEnd={() => endPlanSwipe(plan.id)}
                        onTouchCancel={() => endPlanSwipe(plan.id)}
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          startPlanSwipe(plan.id, event.clientX, event.clientY);
                        }}
                        onPointerMove={(event) => movePlanSwipe(plan.id, event.clientX, event.clientY)}
                        onPointerUp={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endPlanSwipe(plan.id);
                        }}
                        onPointerCancel={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endPlanSwipe(plan.id);
                        }}
                      >
                        <span className="saved-icon" aria-hidden="true">
                          <AppIcon name={plan.icon} className="app-icon app-icon-sm" />
                        </span>
                        <div className="saved-copy">
                          <strong>{plan.title}</strong>
                          <small>
                            {sessionByPlan[plan.id].length} упражнений · {setCountsByPlan[plan.id]} подходов
                          </small>
                        </div>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setSwipedPlanId(null);
                            setSwipedCustomProgramId(null);
                            setSwipedExerciseId(null);
                            openWorkout(plan.id, { logEvent: true });
                          }}
                        >
                          Открыть
                        </button>
                      </article>
                    </div>
                  ))}

                  {customPrograms.map((program) => (
                    <div
                      key={program.id}
                      className={`custom-swipe-row ${swipedCustomProgramId === program.id ? "is-open" : ""}`}
                    >
                      <button
                        type="button"
                        className="custom-swipe-delete-btn"
                        onClick={() => deleteCustomProgram(program.id)}
                      >
                        Удалить
                      </button>

                      <article
                        className="saved-card custom-swipe-card"
                        onTouchStart={(event) =>
                          startCustomProgramSwipe(program.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchMove={(event) =>
                          moveCustomProgramSwipe(program.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchEnd={() => endCustomProgramSwipe(program.id)}
                        onTouchCancel={() => endCustomProgramSwipe(program.id)}
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          startCustomProgramSwipe(program.id, event.clientX, event.clientY);
                        }}
                        onPointerMove={(event) => moveCustomProgramSwipe(program.id, event.clientX, event.clientY)}
                        onPointerUp={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endCustomProgramSwipe(program.id);
                        }}
                        onPointerCancel={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endCustomProgramSwipe(program.id);
                        }}
                      >
                        <span className="saved-icon" aria-hidden="true">
                          <AppIcon name="custom" className="app-icon app-icon-sm" />
                        </span>
                        <div className="saved-copy">
                          <strong>{program.name}</strong>
                          <small>{program.exercises.length} упражнений</small>
                        </div>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setSwipedPlanId(null);
                            setSwipedCustomProgramId(null);
                            setSwipedExerciseId(null);
                            openWorkout("custom", { customProgramId: program.id, logEvent: true });
                          }}
                        >
                          Открыть
                        </button>
                      </article>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {notice ? <p className="inline-notice">{notice}</p> : null}
          </>
        ) : null}

        {screen === "workout" ? (
          <>
            <header className="screen-head screen-head-tight">
              <button type="button" className="icon-btn" onClick={goHome} aria-label="На главную">
                <AppIcon name="home" className="app-icon app-icon-md" />
              </button>

              <div className="head-copy">
                <p className="screen-kicker">Тренировка</p>
                <h2 className="screen-title-sm">{selectedPlan.title}</h2>
              </div>

              <button type="button" className="avatar-btn" onClick={openProgress} aria-label="Открыть прогресс">
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="avatar-img" />
                ) : (
                  <AppIcon name="progress" className="app-icon app-icon-md" />
                )}
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
            <section
              className="plan-hero"
              style={{
                backgroundImage: `linear-gradient(120deg, rgba(17, 24, 39, 0.62), rgba(17, 24, 39, 0.18)), url(${selectedPlan.image})`,
              }}
            >
              <p className="plan-hero-title">{selectedPlan.title}</p>
              <p className="plan-hero-subtitle">{selectedPlan.subtitle}</p>
            </section>

            <section className="quick-actions" aria-label="Быстрые действия">
              {selectedPlanId === "custom" ? (
                <>
                  <button
                    type="button"
                    className={`action-btn ${isCustomBuilderOpen ? "is-active" : ""}`}
                    onClick={() => setIsCustomBuilderOpen((prev) => !prev)}
                  >
                    <span>Редактировать программу</span>
                    <span className="action-hint action-hint-with-icon">
                      <span>{isCustomBuilderOpen ? "Скрыть" : "Открыть"}</span>
                      <span className={`action-toggle-icon ${isCustomBuilderOpen ? "is-open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${isRestPanelOpen || restSeconds !== null ? "is-active" : ""}`}
                    onClick={() => setIsRestPanelOpen((prev) => !prev)}
                  >
                    <span>Отдых</span>
                    <span className="action-hint action-hint-with-icon">
                      <span>{restSeconds !== null ? formatSeconds(restSeconds) : "мин/сек"}</span>
                      <span className={`action-toggle-icon ${isRestPanelOpen ? "is-open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`action-btn ${isExercisePickerOpen ? "is-active" : ""}`}
                    onClick={() => setIsExercisePickerOpen((prev) => !prev)}
                  >
                    <span>Добавить упражнение</span>
                    <span className="action-hint action-hint-with-icon">
                      <span>{isExercisePickerOpen ? "Скрыть" : "Открыть"}</span>
                      <span className={`action-toggle-icon ${isExercisePickerOpen ? "is-open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${isRestPanelOpen || restSeconds !== null ? "is-active" : ""}`}
                    onClick={() => setIsRestPanelOpen((prev) => !prev)}
                  >
                    <span>Отдых</span>
                    <span className="action-hint action-hint-with-icon">
                      <span>{restSeconds !== null ? formatSeconds(restSeconds) : "мин/сек"}</span>
                      <span className={`action-toggle-icon ${isRestPanelOpen ? "is-open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </span>
                  </button>

                  <button type="button" className="action-btn" onClick={clearCurrentPlan}>
                    <span>Очистить день</span>
                    <span className="action-hint">{activeExercises.length}</span>
                  </button>

                  <button type="button" className="action-btn action-btn-save" onClick={saveWorkoutSetup}>
                    <span>Сохранить</span>
                    <span className="action-hint">Скрыть списки</span>
                  </button>
                </>
              )}
            </section>

            {selectedPlanId !== "custom" && isExercisePickerOpen ? (
              <section className="exercise-picker action-drawer" aria-label="Добавление упражнения">
                <div className="drawer-head">
                  <label htmlFor="exercise-select">Упражнения для: {selectedPlan.title}</label>
                  <button
                    type="button"
                    className="drawer-toggle-btn is-open"
                    onClick={() => setIsExercisePickerOpen(false)}
                    aria-label="Скрыть список упражнений"
                  >
                    ▾
                  </button>
                </div>
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
                <div className="drawer-actions">
                  <button type="button" className="secondary-btn" onClick={saveWorkoutSetup}>
                    Сохранить
                  </button>
                </div>
              </section>
            ) : null}

            {selectedPlanId === "custom" && isCustomBuilderOpen ? (
              <section className="custom-program-builder action-drawer" aria-label="Конструктор своей программы">
                <div className="builder-head-row">
                  <div className="builder-head">
                    <p className="builder-title">База упражнений</p>
                    <p className="builder-subtitle">Название и упражнения для своей программы</p>
                  </div>
                  <button
                    type="button"
                    className="drawer-toggle-btn is-open"
                    onClick={() => setIsCustomBuilderOpen(false)}
                    aria-label="Скрыть конструктор"
                  >
                    ▾
                  </button>
                </div>

                {!selectedCustomProgram ? (
                  <div className="custom-name-row">
                    <input
                      className="custom-search-input"
                      type="text"
                      placeholder="Название новой программы"
                      value={customWorkoutNameInput}
                      onChange={(event) => setCustomWorkoutNameInput(event.target.value)}
                    />
                    <button type="button" className="picker-add-btn" onClick={createCustomProgram}>
                      Создать
                    </button>
                  </div>
                ) : null}

                <div className="custom-name-row">
                  <input
                    className="custom-search-input"
                    type="text"
                    placeholder="Название программы"
                    value={customWorkoutNameInput}
                    onChange={(event) => setCustomWorkoutNameInput(event.target.value)}
                    disabled={!selectedCustomProgram}
                  />
                  <button
                    type="button"
                    className="picker-add-btn"
                    onClick={() => renameSelectedCustomProgram(customWorkoutNameInput)}
                    disabled={!selectedCustomProgram}
                  >
                    Переименовать
                  </button>
                </div>

                <div className="custom-name-row">
                  <input
                    className="custom-search-input"
                    type="text"
                    placeholder="Добавить свое упражнение"
                    value={customExerciseInput}
                    onChange={(event) => setCustomExerciseInput(event.target.value)}
                    disabled={!selectedCustomProgram}
                  />
                  <button type="button" className="picker-add-btn" onClick={addManualCustomExercise} disabled={!selectedCustomProgram}>
                    Добавить
                  </button>
                </div>

                <input
                  className="custom-search-input"
                  type="search"
                  placeholder="Поиск упражнения"
                  value={customSearch}
                  onChange={(event) => setCustomSearch(event.target.value)}
                  disabled={!selectedCustomProgram}
                />

                <div className="builder-filters" aria-label="Фильтр базы упражнений">
                  {customFilterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`builder-filter-btn ${customFilter === option.id ? "is-active" : ""}`}
                      onClick={() => setCustomFilter(option.id)}
                      disabled={!selectedCustomProgram}
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
                        <button
                          type="button"
                          className="library-section-title library-section-toggle"
                          onClick={() => toggleLibrarySection(section.id)}
                          aria-expanded={expandedLibrarySections.includes(section.id)}
                        >
                          <span className="library-section-icon" aria-hidden="true">
                            <AppIcon name={section.icon} className="app-icon app-icon-xs" />
                          </span>
                          <span>{section.title}</span>
                          <span
                            className={`library-section-chevron ${
                              expandedLibrarySections.includes(section.id) ? "is-open" : ""
                            }`}
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </button>

                        {expandedLibrarySections.includes(section.id) ? (
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
                                  disabled={!selectedCustomProgram}
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
                                      <span className="library-item-muscles">{formatMuscleList(exerciseDef.primaryMuscles, 2)}</span>
                                    </span>
                                  </span>
                                  <span className="library-item-action">{isAdded ? "Убрать" : "Добавить"}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <div className="drawer-actions">
                  <button type="button" className="secondary-btn" onClick={saveWorkoutSetup}>
                    Сохранить программу
                  </button>
                </div>
              </section>
            ) : null}

            {isRestPanelOpen || restSeconds !== null ? (
              <section className="rest-drawer action-drawer" aria-label="Настройка отдыха">
                <div className="rest-drawer-head">
                  <div>
                    <p className="rest-label">Отдых</p>
                    <p className="rest-value">{restSeconds !== null ? formatSeconds(restSeconds) : "Не запущен"}</p>
                  </div>
                  <button
                    type="button"
                    className={`drawer-toggle-btn ${isRestPanelOpen ? "is-open" : ""}`}
                    onClick={() => setIsRestPanelOpen((prev) => !prev)}
                    aria-label={isRestPanelOpen ? "Скрыть панель отдыха" : "Показать панель отдыха"}
                  >
                    ▾
                  </button>
                </div>

                {isRestPanelOpen ? (
                  <>
                    <div className="rest-input-grid">
                      <label>
                        Мин
                        <input
                          className="rest-time-input"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={restMinutesInput}
                          onChange={(event) => setRestMinutesInput(sanitizeNumber(event.target.value, 2))}
                        />
                      </label>
                      <label>
                        Сек
                        <input
                          className="rest-time-input"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="00"
                          value={restSecondsInput}
                          onChange={(event) => setRestSecondsInput(sanitizeNumber(event.target.value, 2))}
                        />
                      </label>
                    </div>

                    <div className="rest-actions">
                      <button type="button" className="rest-btn" onClick={startRestTimer}>
                        Запустить
                      </button>
                      {restSeconds !== null ? (
                        <button type="button" className="rest-btn is-ghost" onClick={stopRestTimer}>
                          Остановить
                        </button>
                      ) : (
                        <button type="button" className="rest-btn is-ghost" onClick={() => setIsRestPanelOpen(false)}>
                          Скрыть
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {notice ? <p className="inline-notice">{notice}</p> : null}

            <section
              className={`exercise-board ${expandedExerciseId ? "has-focus" : ""}`}
              aria-label="Список упражнений"
            >
              {activeExercises.length === 0 ? (
                <p className="exercise-empty">
                  {selectedPlanId === "custom"
                    ? "Своя программа пока пустая. Нажми «Редактировать программу» и добавь упражнения."
                    : "В этом дне пока нет упражнений. Добавь их через кнопку выше."}
                </p>
              ) : (
                activeExercises.map((exercise) => {
                  const exerciseDef = getExerciseDefinition(exercise.name);
                  const primaryMuscles = exerciseDef ? formatMuscleList(exerciseDef.primaryMuscles) : "";
                  const secondaryMuscles =
                    exerciseDef && exerciseDef.secondaryMuscles.length > 0
                      ? formatMuscleList(exerciseDef.secondaryMuscles, 4)
                      : "";
                  const prWeight = personalRecords.get(exercise.name) ?? 0;

                  return (
                    <div
                      key={exercise.id}
                      className={`exercise-swipe-row ${swipedExerciseId === exercise.id ? "is-open" : ""}`}
                    >
                      <button
                        type="button"
                        className="exercise-swipe-delete-btn"
                        onClick={() => removeExercise(exercise.id)}
                        aria-label={`Удалить упражнение ${exercise.name}`}
                      >
                        Удалить
                      </button>

                      <article
                        className={`exercise-card exercise-swipe-card ${exercise.expanded ? "expanded is-focused" : ""} ${
                          expandedExerciseId && !exercise.expanded ? "is-dimmed" : ""
                        }`}
                      >
                      <button
                        type="button"
                        className="exercise-head"
                        onClick={() => toggleExercise(exercise.id)}
                        aria-expanded={exercise.expanded}
                        onTouchStart={(event) =>
                          startExerciseSwipe(exercise.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchMove={(event) =>
                          moveExerciseSwipe(exercise.id, event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)
                        }
                        onTouchEnd={() => endExerciseSwipe(exercise.id)}
                        onTouchCancel={() => endExerciseSwipe(exercise.id)}
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          startExerciseSwipe(exercise.id, event.clientX, event.clientY);
                        }}
                        onPointerMove={(event) => moveExerciseSwipe(exercise.id, event.clientX, event.clientY)}
                        onPointerUp={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endExerciseSwipe(exercise.id);
                        }}
                        onPointerCancel={(event) => {
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                          endExerciseSwipe(exercise.id);
                        }}
                      >
                        <span className="exercise-icon" aria-hidden="true">
                          <AppIcon name={selectedPlan.icon} className="app-icon app-icon-sm" />
                        </span>
                        <span className="exercise-text">
                          <strong>{exercise.name}</strong>
                          <small>
                            {exercise.sets.length} подходов
                            {exercise.note ? ` · ${exercise.note.slice(0, 44)}` : ""}
                          </small>
                        </span>
                        {!isCardioWorkout && prWeight > 0 ? <span className="exercise-pr">PR {prWeight} кг</span> : null}
                        <span className="exercise-chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>

                      {exercise.expanded ? (
                        <div className="set-panel">
                          {exerciseDef ? (
                            <div className="exercise-insight">
                              <img className="exercise-photo" src={exerciseDef.image} alt={exercise.name} loading="lazy" />
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

                          <label className="exercise-note-field">
                            <span>Примечание</span>
                            <input
                              className="exercise-note-input"
                              type="text"
                              value={exercise.note}
                              placeholder="Например: узкая постановка ног"
                              onChange={(event) => updateExerciseNote(exercise.id, event.target.value)}
                            />
                          </label>

                          <div className="set-head">
                            <span>№</span>
                            <span>{isCardioWorkout ? "мин" : "вес"}</span>
                            <span>{isCardioWorkout ? "км" : "повт."}</span>
                            <span>{isCardioWorkout ? "скор." : "дроп"}</span>
                            <span>удал.</span>
                          </div>

                          {exercise.sets.map((setItem, index) => (
                            <div key={setItem.id} className="set-group">
                              <div className="set-row">
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
                                {isCardioWorkout ? (
                                  <input
                                    className="set-input"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    value={setItem.speed}
                                    onChange={(event) =>
                                      updateSetValue(exercise.id, setItem.id, "speed", event.target.value)
                                    }
                                  />
                                ) : (
                                  <button type="button" className="drop-toggle-btn" onClick={() => addDropSet(exercise.id, setItem.id)}>
                                    дроп+
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="set-remove-btn"
                                  onClick={() => removeSet(exercise.id, setItem.id)}
                                >
                                  ×
                                </button>
                              </div>

                              {!isCardioWorkout && setItem.dropSets.length > 0 ? (
                                <div className="drop-board">
                                  {setItem.dropSets.map((dropSet, dropIndex) => (
                                    <div key={dropSet.id} className="drop-row">
                                      <span className="drop-label">D{dropIndex + 1}</span>
                                      <input
                                        className="set-input drop-input"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="0"
                                        value={dropSet.weight}
                                        onChange={(event) =>
                                          updateDropSetValue(exercise.id, setItem.id, dropSet.id, "weight", event.target.value)
                                        }
                                      />
                                      <input
                                        className="set-input drop-input"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="0"
                                        value={dropSet.reps}
                                        onChange={(event) =>
                                          updateDropSetValue(exercise.id, setItem.id, dropSet.id, "reps", event.target.value)
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="drop-remove-btn"
                                        onClick={() => removeDropSet(exercise.id, setItem.id, dropSet.id)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}

                          <div className="set-actions">
                            <button type="button" className="add-set-btn" onClick={() => addSet(exercise.id)}>
                              Добавить подход
                            </button>
                            <button
                              type="button"
                              className="add-set-btn"
                              onClick={confirmExerciseSetsSaved}
                            >
                              Сохранить
                            </button>
                            <button type="button" className="remove-ex-btn" onClick={() => removeExercise(exercise.id)}>
                              Удалить упражнение
                            </button>
                          </div>
                        </div>
                      ) : null}
                      </article>
                    </div>
                  );
                })
              )}
            </section>
          </>
        ) : null}

        {screen === "progress" ? (
          <>
            <header className="screen-head screen-head-tight">
              <button type="button" className="icon-btn" onClick={goHome} aria-label="На главную">
                <AppIcon name="home" className="app-icon app-icon-md" />
              </button>

              <div className="head-copy">
                <p className="screen-kicker">Прогресс</p>
                <h2 className="screen-title-sm">Статистика и упражнения</h2>
              </div>

              <button type="button" className="icon-btn" onClick={() => openWorkout(selectedPlanId)} aria-label="Открыть тренировку">
                <AppIcon name={selectedPlan.icon} className="app-icon app-icon-md" />
              </button>
            </header>

            <section className="profile-card">
              <div className="section-head">
                <p className="section-title">Тренировки</p>
              </div>

              <div className="stats-grid">
                <div className="stat-tile">
                  <strong>{workoutStats.week}</strong>
                  <span>За неделю</span>
                </div>
                <div className="stat-tile">
                  <strong>{workoutStats.month}</strong>
                  <span>За месяц</span>
                </div>
                <div className="stat-tile">
                  <strong>{workoutStats.total}</strong>
                  <span>Всего</span>
                </div>
              </div>
            </section>

            <section className="measurements-card">
              <div className="section-head">
                <p className="section-title">Часто выбираемые упражнения</p>
              </div>

              {topExercises.length === 0 ? (
                <p className="empty-state">Пока нет данных. Добавь упражнения в тренировки.</p>
              ) : (
                <div className="top-exercise-list">
                  {topExercises.map(([name, count]) => (
                    <article key={name} className="top-exercise-row">
                      <span className="top-exercise-name">{name}</span>
                      <span className="top-exercise-count">{count}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {notice ? <p className="inline-notice">{notice}</p> : null}
          </>
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="Навигация">
        <button type="button" className={`nav-btn ${screen === "home" ? "is-active" : ""}`} onClick={goHome}>
          <AppIcon name="home" className="app-icon app-icon-sm" />
          <span>Главная</span>
        </button>

        <button
          type="button"
          className={`nav-btn ${screen === "workout" ? "is-active" : ""}`}
          onClick={() => openWorkout(selectedPlanId)}
        >
          <AppIcon name={selectedPlan.icon} className="app-icon app-icon-sm" />
          <span>Тренировки</span>
        </button>

        <button type="button" className={`nav-btn ${screen === "progress" ? "is-active" : ""}`} onClick={openProgress}>
          <AppIcon name="progress" className="app-icon app-icon-sm" />
          <span>Прогресс</span>
        </button>
      </nav>
    </div>
  );
}
