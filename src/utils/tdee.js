const ACTIVITY = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const DEFICIT = { "0": 0, "0.25": 250, "0.5": 500, "0.75": 750, "1": 1000 };

export function calculateCalorieGoal({ age, gender, heightCm, weightKg, activityLevel, weeklyLossGoal }) {
  const a = Number(age);
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!a || !h || !w || a <= 0 || h <= 0 || w <= 0 || !gender || !activityLevel) return null;

  const bmr = gender === "male"
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;

  const tdee = Math.round(bmr * (ACTIVITY[activityLevel] ?? 1.2));
  const deficit = DEFICIT[String(weeklyLossGoal)] ?? 0;
  return { bmr: Math.round(bmr), tdee, goal: Math.max(1200, tdee - deficit) };
}
