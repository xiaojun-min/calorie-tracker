import { describe, it, expect } from "vitest";
import { calculateCalorieGoal, calculateNutritionGoals } from "./tdee";

describe("calculateCalorieGoal", () => {
  const base = { age: 30, gender: "male", heightCm: 175, weightKg: 75, activityLevel: "sedentary", weeklyLossGoal: "0" };

  it("returns null when any required field is missing", () => {
    expect(calculateCalorieGoal({})).toBeNull();
    expect(calculateCalorieGoal({ age: 30 })).toBeNull();
    expect(calculateCalorieGoal({ ...base, gender: undefined })).toBeNull();
    expect(calculateCalorieGoal({ ...base, activityLevel: undefined })).toBeNull();
  });

  it("returns null for zero or negative values", () => {
    expect(calculateCalorieGoal({ ...base, age: 0 })).toBeNull();
    expect(calculateCalorieGoal({ ...base, weightKg: -1 })).toBeNull();
    expect(calculateCalorieGoal({ ...base, heightCm: 0 })).toBeNull();
  });

  it("computes male BMR correctly (Mifflin-St Jeor)", () => {
    // BMR = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    const result = calculateCalorieGoal(base);
    expect(result.bmr).toBe(1699);
  });

  it("computes female BMR correctly", () => {
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    const result = calculateCalorieGoal({ age: 25, gender: "female", heightCm: 165, weightKg: 60, activityLevel: "sedentary", weeklyLossGoal: "0" });
    expect(result.bmr).toBe(1345);
  });

  it("applies activity multipliers", () => {
    const sedentary = calculateCalorieGoal({ ...base, activityLevel: "sedentary" });
    const active = calculateCalorieGoal({ ...base, activityLevel: "active" });
    expect(active.tdee).toBeGreaterThan(sedentary.tdee);
    // sedentary: 1699 * 1.2 = 2038.8 → 2039
    expect(sedentary.tdee).toBe(2039);
    // active: raw BMR 1698.75 * 1.725 = 2930.34 → 2930
    expect(active.tdee).toBe(2930);
  });

  it("applies weekly loss deficit correctly", () => {
    // Use an active male so TDEE is high enough that even -1000 stays above the 1200 floor
    const active = { ...base, activityLevel: "active" };
    const maintain = calculateCalorieGoal({ ...active, weeklyLossGoal: "0" });
    const lose05 = calculateCalorieGoal({ ...active, weeklyLossGoal: "0.5" });
    const lose1 = calculateCalorieGoal({ ...active, weeklyLossGoal: "1" });
    expect(maintain.goal).toBe(maintain.tdee);
    expect(lose05.goal).toBe(maintain.tdee - 500);
    expect(lose1.goal).toBe(maintain.tdee - 1000);
  });

  it("floors goal at 1200 kcal minimum", () => {
    // Very small person with aggressive loss — goal should not drop below 1200
    const result = calculateCalorieGoal({ age: 80, gender: "female", heightCm: 140, weightKg: 40, activityLevel: "sedentary", weeklyLossGoal: "1" });
    expect(result.goal).toBeGreaterThanOrEqual(1200);
  });

  it("returns bmr, tdee, and goal fields", () => {
    const result = calculateCalorieGoal(base);
    expect(result).toHaveProperty("bmr");
    expect(result).toHaveProperty("tdee");
    expect(result).toHaveProperty("goal");
  });
});

describe("calculateNutritionGoals", () => {
  const profile = { age: 30, gender: "male", heightCm: 175, weightKg: 75, activityLevel: "sedentary", weeklyLossGoal: "0" };

  it("returns null for incomplete profile", () => {
    expect(calculateNutritionGoals({})).toBeNull();
  });

  it("returns goals based on calorie target", () => {
    const goals = calculateNutritionGoals(profile);
    const calTarget = calculateCalorieGoal(profile).goal;
    expect(goals.calories).toBe(calTarget);
    // 25% of calories from protein, 4 cal/g
    expect(goals.protein).toBe(Math.round((calTarget * 0.25) / 4));
    // 50% from carbs
    expect(goals.carbs).toBe(Math.round((calTarget * 0.50) / 4));
    // 25% from fat, 9 cal/g
    expect(goals.fat).toBe(Math.round((calTarget * 0.25) / 9));
    // 10% from sugar
    expect(goals.sugar).toBe(Math.round((calTarget * 0.10) / 4));
    // sodium fixed
    expect(goals.sodium).toBe(2300);
  });

  it("uses male fiber goal of 38g", () => {
    const goals = calculateNutritionGoals({ ...profile, gender: "male" });
    expect(goals.fiber).toBe(38);
  });

  it("uses female fiber goal of 25g", () => {
    const goals = calculateNutritionGoals({ ...profile, gender: "female" });
    expect(goals.fiber).toBe(25);
  });
});
