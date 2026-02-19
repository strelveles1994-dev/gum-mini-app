export type BasePlanId = "upper" | "lower" | "cardio";

export type ExerciseDefinition = {
  id: string;
  plan: BasePlanId;
  name: string;
  sourceName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  image: string;
};

const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

function exerciseImage(id: string): string {
  return `${EXERCISE_IMAGE_BASE}/${id}/0.jpg`;
}

export const muscleLabelByKey: Record<string, string> = {
  abdominals: "пресс",
  abductors: "отводящие мышцы",
  adductors: "приводящие мышцы",
  biceps: "бицепс",
  calves: "икры",
  chest: "грудь",
  forearms: "предплечья",
  glutes: "ягодицы",
  hamstrings: "бицепс бедра",
  lats: "широчайшие",
  "lower back": "поясница",
  "middle back": "середина спины",
  quadriceps: "квадрицепсы",
  shoulders: "плечи",
  traps: "трапеции",
  triceps: "трицепс",
};

function makeExercise(input: {
  id: string;
  plan: BasePlanId;
  name: string;
  sourceName: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  image?: string;
}): ExerciseDefinition {
  return {
    ...input,
    secondaryMuscles: input.secondaryMuscles ?? [],
    image: input.image ?? exerciseImage(input.id),
  };
}

const exerciseCatalog: ExerciseDefinition[] = [
  makeExercise({
    id: "Barbell_Bench_Press_-_Medium_Grip",
    plan: "upper",
    name: "Жим штанги лежа",
    sourceName: "Barbell Bench Press - Medium Grip",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Dumbbell_Bench_Press",
    plan: "upper",
    name: "Жим гантелей лежа",
    sourceName: "Dumbbell Bench Press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Incline_Dumbbell_Press",
    plan: "upper",
    name: "Жим гантелей на наклонной скамье",
    sourceName: "Incline Dumbbell Press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Pushups",
    plan: "upper",
    name: "Отжимания от пола",
    sourceName: "Pushups",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Dips_-_Chest_Version",
    plan: "upper",
    name: "Отжимания на брусьях",
    sourceName: "Dips - Chest Version",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Cable_Crossover",
    plan: "upper",
    name: "Сведение рук в кроссовере",
    sourceName: "Cable Crossover",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
  }),
  makeExercise({
    id: "Low_Cable_Crossover",
    plan: "upper",
    name: "Сведение рук в нижнем кроссовере",
    sourceName: "Low Cable Crossover",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
  }),
  makeExercise({
    id: "Single-Arm_Cable_Crossover",
    plan: "upper",
    name: "Сведение одной рукой в кроссовере",
    sourceName: "Single-Arm Cable Crossover",
    primaryMuscles: ["chest"],
  }),
  makeExercise({
    id: "Smith_Machine_Bench_Press",
    plan: "upper",
    name: "Жим в тренажере Смита",
    sourceName: "Smith Machine Bench Press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Smith_Machine_Incline_Bench_Press",
    plan: "upper",
    name: "Жим на наклонной скамье в Смите",
    sourceName: "Smith Machine Incline Bench Press",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
  }),
  makeExercise({
    id: "Wide-Grip_Lat_Pulldown",
    plan: "upper",
    name: "Тяга верхнего блока широким хватом",
    sourceName: "Wide-Grip Lat Pulldown",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "middle back", "shoulders"],
  }),
  makeExercise({
    id: "Seated_Cable_Rows",
    plan: "upper",
    name: "Тяга горизонтального блока сидя",
    sourceName: "Seated Cable Rows",
    primaryMuscles: ["middle back"],
    secondaryMuscles: ["biceps", "lats", "shoulders"],
  }),
  makeExercise({
    id: "Bent_Over_Barbell_Row",
    plan: "upper",
    name: "Тяга штанги в наклоне",
    sourceName: "Bent Over Barbell Row",
    primaryMuscles: ["middle back"],
    secondaryMuscles: ["biceps", "lats", "shoulders"],
  }),
  makeExercise({
    id: "Smith_Machine_Bent_Over_Row",
    plan: "upper",
    name: "Тяга в наклоне в Смите",
    sourceName: "Smith Machine Bent Over Row",
    primaryMuscles: ["middle back"],
    secondaryMuscles: ["biceps", "lats", "shoulders"],
  }),
  makeExercise({
    id: "T-Bar_Row_with_Handle",
    plan: "upper",
    name: "Тяга Т-грифа",
    sourceName: "T-Bar Row with Handle",
    primaryMuscles: ["middle back"],
    secondaryMuscles: ["biceps", "lats"],
  }),
  makeExercise({
    id: "Chin-Up",
    plan: "upper",
    name: "Подтягивания обратным хватом",
    sourceName: "Chin-Up",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "forearms", "middle back"],
  }),
  makeExercise({
    id: "Face_Pull",
    plan: "upper",
    name: "Тяга каната к лицу",
    sourceName: "Face Pull",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["middle back"],
  }),
  makeExercise({
    id: "Barbell_Shoulder_Press",
    plan: "upper",
    name: "Жим штанги над головой",
    sourceName: "Barbell Shoulder Press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["chest", "triceps"],
  }),
  makeExercise({
    id: "Smith_Machine_Overhead_Shoulder_Press",
    plan: "upper",
    name: "Жим над головой в Смите",
    sourceName: "Smith Machine Overhead Shoulder Press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
  }),
  makeExercise({
    id: "Seated_Dumbbell_Press",
    plan: "upper",
    name: "Жим гантелей сидя",
    sourceName: "Seated Dumbbell Press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
  }),
  makeExercise({
    id: "Arnold_Dumbbell_Press",
    plan: "upper",
    name: "Жим Арнольда",
    sourceName: "Arnold Dumbbell Press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
  }),
  makeExercise({
    id: "Side_Lateral_Raise",
    plan: "upper",
    name: "Махи гантелями в стороны",
    sourceName: "Side Lateral Raise",
    primaryMuscles: ["shoulders"],
  }),
  makeExercise({
    id: "Barbell_Curl",
    plan: "upper",
    name: "Подъем штанги на бицепс",
    sourceName: "Barbell Curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
  }),
  makeExercise({
    id: "Dumbbell_Bicep_Curl",
    plan: "upper",
    name: "Сгибание рук с гантелями",
    sourceName: "Dumbbell Bicep Curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
  }),
  makeExercise({
    id: "Triceps_Pushdown",
    plan: "upper",
    name: "Разгибание рук в верхнем блоке",
    sourceName: "Triceps Pushdown",
    primaryMuscles: ["triceps"],
  }),
  makeExercise({
    id: "Close-Grip_Barbell_Bench_Press",
    plan: "upper",
    name: "Жим лежа узким хватом",
    sourceName: "Close-Grip Barbell Bench Press",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["chest", "shoulders"],
  }),
  makeExercise({
    id: "Smith_Machine_Close-Grip_Bench_Press",
    plan: "upper",
    name: "Жим узким хватом в Смите",
    sourceName: "Smith Machine Close-Grip Bench Press",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["chest", "shoulders"],
  }),
  makeExercise({
    id: "Barbell_Squat",
    plan: "lower",
    name: "Приседания со штангой",
    sourceName: "Barbell Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings", "lower back"],
  }),
  makeExercise({
    id: "Smith_Machine_Squat",
    plan: "lower",
    name: "Приседания в Смите",
    sourceName: "Smith Machine Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings", "lower back"],
  }),
  makeExercise({
    id: "Front_Barbell_Squat",
    plan: "lower",
    name: "Фронтальные приседания",
    sourceName: "Front Barbell Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Hack_Squat",
    plan: "lower",
    name: "Гакк-присед",
    sourceName: "Hack Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Leg_Press",
    plan: "lower",
    name: "Жим ногами",
    sourceName: "Leg Press",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Smith_Machine_Leg_Press",
    plan: "lower",
    name: "Жим ногами в Смите",
    sourceName: "Smith Machine Leg Press",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Barbell_Lunge",
    plan: "lower",
    name: "Выпады со штангой",
    sourceName: "Barbell Lunge",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Barbell_Walking_Lunge",
    plan: "lower",
    name: "Шагающие выпады со штангой",
    sourceName: "Barbell Walking Lunge",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Smith_Single-Leg_Split_Squat",
    plan: "lower",
    name: "Болгарские приседания в Смите",
    sourceName: "Smith Single-Leg Split Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Romanian_Deadlift",
    plan: "lower",
    name: "Румынская тяга",
    sourceName: "Romanian Deadlift",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["calves", "glutes", "lower back"],
  }),
  makeExercise({
    id: "Sumo_Deadlift",
    plan: "lower",
    name: "Становая тяга сумо",
    sourceName: "Sumo Deadlift",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["adductors", "glutes", "lower back", "quadriceps", "traps"],
  }),
  makeExercise({
    id: "Stiff-Legged_Barbell_Deadlift",
    plan: "lower",
    name: "Тяга на прямых ногах",
    sourceName: "Stiff-Legged Barbell Deadlift",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["glutes", "lower back"],
  }),
  makeExercise({
    id: "Smith_Machine_Stiff-Legged_Deadlift",
    plan: "lower",
    name: "Тяга на прямых ногах в Смите",
    sourceName: "Smith Machine Stiff-Legged Deadlift",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["glutes", "lower back"],
  }),
  makeExercise({
    id: "Barbell_Hip_Thrust",
    plan: "lower",
    name: "Ягодичный мостик со штангой",
    sourceName: "Barbell Hip Thrust",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["calves", "hamstrings"],
  }),
  makeExercise({
    id: "Barbell_Glute_Bridge",
    plan: "lower",
    name: "Ягодичный мостик на полу со штангой",
    sourceName: "Barbell Glute Bridge",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["calves", "hamstrings"],
  }),
  makeExercise({
    id: "Hyperextensions_Back_Extensions",
    plan: "lower",
    name: "Гиперэкстензия",
    sourceName: "Hyperextensions (Back Extensions)",
    primaryMuscles: ["lower back"],
    secondaryMuscles: ["glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Lying_Leg_Curls",
    plan: "lower",
    name: "Сгибание ног лежа",
    sourceName: "Lying Leg Curls",
    primaryMuscles: ["hamstrings"],
  }),
  makeExercise({
    id: "Leg_Extensions",
    plan: "lower",
    name: "Разгибание ног в тренажере",
    sourceName: "Leg Extensions",
    primaryMuscles: ["quadriceps"],
  }),
  makeExercise({
    id: "Glute_Kickback",
    plan: "lower",
    name: "Отведение ноги назад",
    sourceName: "Glute Kickback",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
  }),
  makeExercise({
    id: "Hip_Extension_with_Bands",
    plan: "lower",
    name: "Разгибание бедра с лентой",
    sourceName: "Hip Extension with Bands",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
  }),
  makeExercise({
    id: "Standing_Calf_Raises",
    plan: "lower",
    name: "Подъем на носки стоя",
    sourceName: "Standing Calf Raises",
    primaryMuscles: ["calves"],
  }),
  makeExercise({
    id: "Seated_Calf_Raise",
    plan: "lower",
    name: "Подъем на носки сидя",
    sourceName: "Seated Calf Raise",
    primaryMuscles: ["calves"],
  }),
  makeExercise({
    id: "Goblet_Squat",
    plan: "lower",
    name: "Гоблет-присед",
    sourceName: "Goblet Squat",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Good_Morning",
    plan: "lower",
    name: "Наклоны со штангой",
    sourceName: "Good Morning",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["abdominals", "glutes", "lower back"],
  }),
  makeExercise({
    id: "Jogging_Treadmill",
    plan: "cardio",
    name: "Бег на дорожке (легкий темп)",
    sourceName: "Jogging, Treadmill",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Running_Treadmill",
    plan: "cardio",
    name: "Бег на дорожке (интенсивный)",
    sourceName: "Running, Treadmill",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Walking_Treadmill",
    plan: "cardio",
    name: "Ходьба на дорожке",
    sourceName: "Walking, Treadmill",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Bicycling_Stationary",
    plan: "cardio",
    name: "Велотренажер",
    sourceName: "Bicycling, Stationary",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Elliptical_Trainer",
    plan: "cardio",
    name: "Эллиптический тренажер",
    sourceName: "Elliptical Trainer",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Rowing_Stationary",
    plan: "cardio",
    name: "Гребной тренажер",
    sourceName: "Rowing, Stationary",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["biceps", "glutes", "hamstrings", "lower back", "middle back"],
  }),
  makeExercise({
    id: "Rope_Jumping",
    plan: "cardio",
    name: "Скакалка",
    sourceName: "Rope Jumping",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "hamstrings"],
  }),
  makeExercise({
    id: "Step_Mill",
    plan: "cardio",
    name: "Step Mill",
    sourceName: "Step Mill",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Stairmaster",
    plan: "cardio",
    name: "Stairmaster",
    sourceName: "Stairmaster",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
  makeExercise({
    id: "Trail_Running_Walking",
    plan: "cardio",
    name: "Бег/ходьба по пересеченной местности",
    sourceName: "Trail Running/Walking",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["calves", "glutes", "hamstrings"],
  }),
];

export const exerciseCatalogByPlan = exerciseCatalog.reduce(
  (acc, exercise) => {
    acc[exercise.plan].push(exercise);
    return acc;
  },
  {
    upper: [] as ExerciseDefinition[],
    lower: [] as ExerciseDefinition[],
    cardio: [] as ExerciseDefinition[],
  },
);

export const baseExercisesByPlan: Record<BasePlanId, string[]> = {
  upper: exerciseCatalogByPlan.upper.map((exercise) => exercise.name),
  lower: exerciseCatalogByPlan.lower.map((exercise) => exercise.name),
  cardio: exerciseCatalogByPlan.cardio.map((exercise) => exercise.name),
};

const exerciseByName = new Map(exerciseCatalog.map((exercise) => [exercise.name, exercise]));

const legacyAliasByName: Record<string, string> = {
  "Жим лежа": "Жим штанги лежа",
  "Тяга верхнего блока": "Тяга верхнего блока широким хватом",
  "Тяга горизонтального блока": "Тяга горизонтального блока сидя",
  "Жим гантелей сидя": "Жим гантелей сидя",
  "Тяга к подбородку": "Тяга каната к лицу",
  "Разведение гантелей в стороны": "Махи гантелями в стороны",
  "Французский жим": "Жим лежа узким хватом",
  "Разгибания рук в блоке": "Разгибание рук в верхнем блоке",
  "Сгибания рук с гантелями": "Сгибание рук с гантелями",
  "Кроссовер": "Сведение рук в кроссовере",
  "Сведение в кроссовере": "Сведение рук в кроссовере",
  "Кроссовер снизу вверх": "Сведение рук в нижнем кроссовере",
  "Жим в Смите": "Жим в тренажере Смита",
  "Жим лежа в Смите": "Жим в тренажере Смита",
  "Жим под углом в Смите": "Жим на наклонной скамье в Смите",
  "Жим узким хватом в тренажере Смита": "Жим узким хватом в Смите",
  "Тяга в наклоне в тренажере Смита": "Тяга в наклоне в Смите",
  "Приседания": "Приседания со штангой",
  "Приседания в тренажере Смита": "Приседания в Смите",
  "Выпады": "Выпады со штангой",
  "Ягодичный мостик": "Ягодичный мостик со штангой",
  "Становая тяга": "Становая тяга сумо",
  "Болгарские сплит-приседания": "Шагающие выпады со штангой",
  "Болгарские приседания в тренажере Смита": "Болгарские приседания в Смите",
  "Жим ногами в тренажере Смита": "Жим ногами в Смите",
  "Тяга на прямых ногах в тренажере Смита": "Тяга на прямых ногах в Смите",
  "Махи ногой в сторону": "Отведение ноги назад",
  "Отведение ноги назад в кроссовере": "Отведение ноги назад",
  "Беговая дорожка (ровный темп)": "Бег на дорожке (легкий темп)",
  "Интервальный бег": "Бег на дорожке (интенсивный)",
  "Эллипс": "Эллиптический тренажер",
  "Скакалка интервалы": "Скакалка",
  "Ходьба в горку": "Ходьба на дорожке",
  "Степпер": "Stairmaster",
  "Air Bike интервалы": "Велотренажер",
  "HIIT-круг 20/40": "Бег на дорожке (интенсивный)",
};

export function getExerciseDefinition(name: string): ExerciseDefinition | undefined {
  const direct = exerciseByName.get(name);
  if (direct) return direct;

  const alias = legacyAliasByName[name];
  return alias ? exerciseByName.get(alias) : undefined;
}

export function formatMuscleList(muscles: string[], maxItems = 3): string {
  const labels = muscles.map((muscle) => muscleLabelByKey[muscle] ?? muscle);
  if (labels.length <= maxItems) return labels.join(", ");
  return `${labels.slice(0, maxItems).join(", ")} +${labels.length - maxItems}`;
}
