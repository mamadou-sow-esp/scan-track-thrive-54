// Mifflin-St Jeor BMR + TDEE + macro split based on goal type.

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_DELTA: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 350,
};

export function calcBMR(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function calcTargets(opts: {
  sex: Sex; weight: number; height: number; age: number;
  activity: Activity; goal: GoalType;
}) {
  const bmr = calcBMR(opts.sex, opts.weight, opts.height, opts.age);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[opts.activity]);
  const calories = Math.max(1200, tdee + GOAL_DELTA[opts.goal]);

  // Macro split per goal
  let pPct = 0.30, fPct = 0.25, cPct = 0.45;
  if (opts.goal === "lose")  { pPct = 0.35; fPct = 0.30; cPct = 0.35; }
  if (opts.goal === "gain")  { pPct = 0.28; fPct = 0.22; cPct = 0.50; }

  return {
    bmr,
    tdee,
    daily_calories: calories,
    daily_proteins: Math.round((calories * pPct) / 4),
    daily_carbs:    Math.round((calories * cPct) / 4),
    daily_fats:     Math.round((calories * fPct) / 9),
  };
}

// Steps -> kcal burned (rough): kcal ≈ steps × weight(kg) × 0.0005
export function stepsToKcal(steps: number, weightKg: number | null) {
  const w = weightKg && weightKg > 0 ? weightKg : 70;
  return Math.round(steps * w * 0.0005);
}
