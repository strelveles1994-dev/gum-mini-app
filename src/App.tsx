
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

type DayPlanId = "upper" | "lower" | "cardio" | "custom";
type CustomLibraryFilter = "all" | BasePlanId;
type AppScreen = "home" | "workout" | "profile";
type IconName = DayPlanId | "home" | "profile" | "add";
type MeasurementIconName = "date" | "height" | "weight" | "chest" | "waist" | "glutes" | "thighs" | "belly";

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
  dropSets: DropSet[];
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
type DropSetField = "weight" | "reps";

type CalendarDay = {
  key: string;
  weekday: string;
  dayNumber: string;
  fullLabel: string;
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

const STORAGE_KEY = "gym-check-session-v7";
const PROFILE_STORAGE_KEY = "gym-check-profile-v3";
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
    subtitle: "Ягодичные, квадрицепс, задняя поверхность бедра",
    icon: "lower",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
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

function createSet(weight = "", reps = "", dropSets?: DropSet[]): WorkoutSet {
  return {
    id: createId(),
    weight: sanitizeNumber(weight, 3),
    reps: sanitizeNumber(reps, 2),
    dropSets: dropSets && dropSets.length > 0 ? dropSets : [],
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
    upper: [],
    lower: [],
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
          );
        })
        .filter((setItem): setItem is WorkoutSet => Boolean(setItem));

      return {
        id: createId(),
        name: canonicalName,
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

  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.8 18.4C6.9 15.6 9 14.2 12 14.2C15 14.2 17.1 15.6 18.2 18.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  if (name === "chest") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M7 6.6C8.1 7.9 9.4 8.6 12 8.6C14.6 8.6 15.9 7.9 17 6.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6.4 11.2C7.5 12.4 9.2 13.2 12 13.2C14.8 13.2 16.5 12.4 17.6 11.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 18.2C8.8 16.2 10 15.2 12 15.2C14 15.2 15.2 16.2 16 18.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

  if (name === "glutes") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M8.5 6.2C8.5 8 9.4 9.6 12 9.6C14.6 9.6 15.5 8 15.5 6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6.5 11.4C6.5 14.9 8.5 18 12 18C15.5 18 17.5 14.9 17.5 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.8 13.6C5.3 13.6 6.3 12.7 6.3 11.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20.2 13.6C18.7 13.6 17.7 12.7 17.7 11.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "thighs") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M9 5.8L11.3 9.8L9.5 13.2L10.8 18.2H13.4L12.1 13.2L14.4 9.8L13 5.8H9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.3 6.8C9.4 8.3 10.2 9.4 10.2 11.1C10.2 13 8.7 14.5 6.8 14.5C4.9 14.5 3.4 13 3.4 11.1C3.4 9.4 4.2 8.3 5.3 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.7 6.8C19.8 8.3 20.6 9.4 20.6 11.1C20.6 13 19.1 14.5 17.2 14.5C15.3 14.5 13.8 13 13.8 11.1C13.8 9.4 14.6 8.3 15.7 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.8 15.6V18.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17.2 15.6V18.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.8 18.2H17.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  const [profile, setProfile] = useState<ProfileState>(() => loadProfileState());
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [isRestPanelOpen, setIsRestPanelOpen] = useState(false);
  const [restMinutesInput, setRestMinutesInput] = useState(() => String(Math.floor(DEFAULT_REST_SECONDS / 60)));
  const [restSecondsInput, setRestSecondsInput] = useState(() => String(DEFAULT_REST_SECONDS % 60).padStart(2, "0"));
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [customFilter, setCustomFilter] = useState<CustomLibraryFilter>("all");
  const [isMeasurementsExpanded, setIsMeasurementsExpanded] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [selectedExerciseByPlan, setSelectedExerciseByPlan] = useState<SelectedExerciseByPlan>({
    upper: exercisesByPlan.upper[0] ?? "",
    lower: exercisesByPlan.lower[0] ?? "",
    cardio: exercisesByPlan.cardio[0] ?? "",
    custom: exercisesByPlan.custom[0] ?? "",
  });

  const selectedPlan = dayPlanById[selectedPlanId];
  const activeExercises = sessionByPlan[selectedPlanId];
  const weekDays = useMemo(() => buildCalendarWeek(new Date()), []);
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

  const plansWithWorkouts = useMemo(
    () => dayPlans.filter((plan) => sessionByPlan[plan.id].length > 0),
    [sessionByPlan],
  );

  const setCountsByPlan = useMemo(
    () =>
      dayPlans.reduce(
        (acc, plan) => {
          acc[plan.id] = sessionByPlan[plan.id].reduce((sum, exercise) => sum + exercise.sets.length, 0);
          return acc;
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
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

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

  function triggerImpact(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light") {
    tg?.HapticFeedback?.impactOccurred?.(style);
  }

  function updateExercisesForPlan(planId: DayPlanId, updater: (prev: SessionExercise[]) => SessionExercise[]) {
    setSessionByPlan((prev) => ({
      ...prev,
      [planId]: updater(prev[planId]),
    }));
  }

  function openWorkout(planId: DayPlanId) {
    setSelectedPlanId(planId);
    setScreen("workout");
    setIsCreateWorkoutOpen(false);
    setIsExercisePickerOpen(false);
    setIsCustomBuilderOpen(false);
  }

  function goHome() {
    setScreen("home");
    setIsCreateWorkoutOpen(false);
    setIsExercisePickerOpen(false);
    setIsCustomBuilderOpen(false);
    setIsRestPanelOpen(false);
  }

  function openProfile() {
    setScreen("profile");
    setIsCreateWorkoutOpen(false);
    setIsExercisePickerOpen(false);
    setIsCustomBuilderOpen(false);
    setIsRestPanelOpen(false);
  }

  function addExerciseToPlan(planId: DayPlanId, exerciseName: string) {
    const normalizedName = (getExerciseDefinition(exerciseName)?.name ?? exerciseName).trim();
    if (!normalizedName) return;

    let added = false;

    updateExercisesForPlan(planId, (prev) => {
      const alreadyExists = prev.some((exercise) => exercise.name.toLowerCase() === normalizedName.toLowerCase());
      if (alreadyExists) return prev;

      added = true;
      return [...prev, createExercise(normalizedName)];
    });

    if (added) {
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

    addExerciseToPlan(selectedPlanId, exerciseName);
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

    setNotice(removed ? `Убрано: ${normalizedName}` : `Добавлено: ${normalizedName}`);
    triggerImpact("soft");
  }
  function toggleExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, expanded: !exercise.expanded } : exercise,
      ),
    );
  }

  function removeExercise(exerciseId: string) {
    updateExercisesForPlan(selectedPlanId, (prev) => prev.filter((exercise) => exercise.id !== exerciseId));
    setNotice("Упражнение удалено");
    triggerImpact("soft");
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
    updateExercisesForPlan(selectedPlanId, () => []);
    setNotice("Тренировка очищена");
    triggerImpact("rigid");
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

              <button type="button" className="avatar-btn" onClick={openProfile} aria-label="Открыть профиль">
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="avatar-img" />
                ) : (
                  <AppIcon name="profile" className="app-icon app-icon-md" />
                )}
              </button>
            </header>

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
                  <MeasurementIcon name="chest" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.chest, " см")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="waist" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.waist, " см")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="glutes" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.glutes, " см")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="thighs" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.thighs, " см")}</span>
                </div>
                <div className="measurement-item" role="listitem">
                  <MeasurementIcon name="belly" className="measurement-item-icon" />
                  <span className="measurement-item-value">{formatMetric(summaryMeasurement.belly, " см")}</span>
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
                <span>{isCreateWorkoutOpen ? "Скрыть список" : "Добавить тренировку"}</span>
              </button>

              {isCreateWorkoutOpen ? (
                <div className="plan-picker action-drawer" aria-label="Выбрать тренировочный день">
                  {dayPlans.map((plan) => {
                    const exerciseCount = sessionByPlan[plan.id].length;

                    return (
                      <button key={plan.id} type="button" className="plan-option" onClick={() => openWorkout(plan.id)}>
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
                </div>
              ) : null}
            </section>

            <section className="saved-workouts">
              <div className="section-head">
                <p className="section-title">Мои тренировки</p>
              </div>

              {plansWithWorkouts.length === 0 ? (
                <p className="empty-state">Пока пусто. Добавь первую тренировку через кнопку выше.</p>
              ) : (
                <div className="saved-list">
                  {plansWithWorkouts.map((plan) => (
                    <article key={plan.id} className="saved-card">
                      <span className="saved-icon" aria-hidden="true">
                        <AppIcon name={plan.icon} className="app-icon app-icon-sm" />
                      </span>
                      <div className="saved-copy">
                        <strong>{plan.title}</strong>
                        <small>
                          {sessionByPlan[plan.id].length} упражнений · {setCountsByPlan[plan.id]} подходов
                        </small>
                      </div>
                      <button type="button" className="ghost-btn" onClick={() => openWorkout(plan.id)}>
                        Открыть
                      </button>
                    </article>
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

              <button type="button" className="avatar-btn" onClick={openProfile} aria-label="Открыть профиль">
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="avatar-img" />
                ) : (
                  <AppIcon name="profile" className="app-icon app-icon-md" />
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
                <button
                  type="button"
                  className={`action-btn ${isCustomBuilderOpen ? "is-active" : ""}`}
                  onClick={() => setIsCustomBuilderOpen((prev) => !prev)}
                >
                  <span>База упражнений</span>
                  <span className="action-hint">{isCustomBuilderOpen ? "Скрыть" : "Открыть"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`action-btn ${isExercisePickerOpen ? "is-active" : ""}`}
                  onClick={() => setIsExercisePickerOpen((prev) => !prev)}
                >
                  <span>Добавить упражнение</span>
                  <span className="action-hint">{isExercisePickerOpen ? "Скрыть" : "Открыть"}</span>
                </button>
              )}

              <button
                type="button"
                className={`action-btn ${isRestPanelOpen || restSeconds !== null ? "is-active" : ""}`}
                onClick={() => setIsRestPanelOpen((prev) => !prev)}
              >
                <span>Отдых</span>
                <span className="action-hint">{restSeconds !== null ? formatSeconds(restSeconds) : "мин/сек"}</span>
              </button>

              <button type="button" className="action-btn" onClick={clearCurrentPlan}>
                <span>Очистить день</span>
                <span className="action-hint">{activeExercises.length}</span>
              </button>
            </section>

            {selectedPlanId !== "custom" && isExercisePickerOpen ? (
              <section className="exercise-picker action-drawer" aria-label="Добавление упражнения">
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
            ) : null}

            {selectedPlanId === "custom" && isCustomBuilderOpen ? (
              <section className="custom-program-builder action-drawer" aria-label="Конструктор своей программы">
                <div className="builder-head">
                  <p className="builder-title">База упражнений</p>
                  <p className="builder-subtitle">Выбери, что добавить в свою программу</p>
                </div>

                <input
                  className="custom-search-input"
                  type="search"
                  placeholder="Поиск упражнения"
                  value={customSearch}
                  onChange={(event) => setCustomSearch(event.target.value)}
                />

                <div className="builder-filters" aria-label="Фильтр базы упражнений">
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
                                  <img src={exerciseDef.image} alt={exerciseName} className="library-item-thumb" loading="lazy" />
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
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {isRestPanelOpen || restSeconds !== null ? (
              <section className="rest-drawer action-drawer" aria-label="Настройка отдыха">
                <div className="rest-drawer-head">
                  <p className="rest-label">Отдых</p>
                  <p className="rest-value">{restSeconds !== null ? formatSeconds(restSeconds) : "Не запущен"}</p>
                </div>

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
              </section>
            ) : null}

            {notice ? <p className="inline-notice">{notice}</p> : null}

            <section className="exercise-board" aria-label="Список упражнений">
              {activeExercises.length === 0 ? (
                <p className="exercise-empty">
                  {selectedPlanId === "custom"
                    ? "Своя программа пока пустая. Открой базу упражнений и добавь нужные позиции."
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
                          <small>{exercise.sets.length} подходов</small>
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

                          <div className="set-head">
                            <span>№</span>
                            <span>вес</span>
                            <span>повт.</span>
                            <span>дроп</span>
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
                                <button type="button" className="drop-toggle-btn" onClick={() => addDropSet(exercise.id, setItem.id)}>
                                  дроп+
                                </button>
                                <button type="button" className="set-remove-btn" onClick={() => removeSet(exercise.id, setItem.id)}>
                                  ×
                                </button>
                              </div>

                              {setItem.dropSets.length > 0 ? (
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
                            <button type="button" className="remove-ex-btn" onClick={() => removeExercise(exercise.id)}>
                              Удалить упражнение
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </section>
          </>
        ) : null}

        {screen === "profile" ? (
          <>
            <header className="screen-head screen-head-tight">
              <button type="button" className="icon-btn" onClick={goHome} aria-label="На главную">
                <AppIcon name="home" className="app-icon app-icon-md" />
              </button>

              <div className="head-copy">
                <p className="screen-kicker">Профиль</p>
                <h2 className="screen-title-sm">Аккаунт</h2>
              </div>

              <button type="button" className="icon-btn" onClick={() => openWorkout(selectedPlanId)} aria-label="Открыть тренировку">
                <AppIcon name={selectedPlan.icon} className="app-icon app-icon-md" />
              </button>
            </header>

            <section className="profile-card">
              <div className="profile-top">
                <div className="profile-avatar">
                  {userPhoto ? (
                    <img src={userPhoto} alt={userName} className="avatar-img" />
                  ) : (
                    <AppIcon name="profile" className="app-icon app-icon-lg" />
                  )}
                </div>

                <div className="profile-copy">
                  <p className="profile-name">{userName}</p>
                  <p className="profile-note">Замеры и прогресс доступны на главной странице</p>
                </div>
              </div>

              <p className="profile-hint">
                Для новых замеров используй кнопку <strong>+</strong> в блоке <strong>Замеры</strong> на главной.
              </p>
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
          <span>Тренировка</span>
        </button>

        <button type="button" className={`nav-btn ${screen === "profile" ? "is-active" : ""}`} onClick={openProfile}>
          <AppIcon name="profile" className="app-icon app-icon-sm" />
          <span>Профиль</span>
        </button>
      </nav>
    </div>
  );
}
