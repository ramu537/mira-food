import { dateRange } from "./dates.js";

export const defaultGoal = {
  calories: 2200,
  protein: 165,
  carbs: 248,
  fat: 61,
  waterGlasses: 8,
};

export const mealTypes = [
  { value: "BREAKFAST", label: "Breakfast", hint: "Morning", icon: "Sunrise", color: "var(--meal-breakfast)" },
  { value: "LUNCH", label: "Lunch", hint: "Midday", icon: "Sun", color: "var(--meal-lunch)" },
  { value: "SNACK", label: "Snack", hint: "Anytime", icon: "Apple", color: "var(--meal-snack)" },
  { value: "DINNER", label: "Dinner", hint: "Evening", icon: "MoonStar", color: "var(--meal-dinner)" },
];

export function entriesOn(entries, date) {
  return entries.filter((entry) => entry.loggedOn === date);
}

export function nutritionTotal(entries) {
  return entries.reduce((total, entry) => ({
    calories: total.calories + Number(entry.calories || 0),
    protein: total.protein + Number(entry.protein || 0),
    carbs: total.carbs + Number(entry.carbs || 0),
    fat: total.fat + Number(entry.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function percentage(value, goal, cap = 100) {
  if (!(goal > 0)) return 0;
  return Math.min(cap, Math.round((Number(value || 0) / goal) * 100));
}

export function macroEnergy(total) {
  const protein = Number(total.protein || 0) * 4;
  const carbs = Number(total.carbs || 0) * 4;
  const fat = Number(total.fat || 0) * 9;
  const all = protein + carbs + fat;
  return {
    total: all,
    protein,
    carbs,
    fat,
    proteinShare: all ? Math.round((protein / all) * 100) : 0,
    carbsShare: all ? Math.round((carbs / all) * 100) : 0,
    fatShare: all ? Math.round((fat / all) * 100) : 0,
  };
}

export function trendSummary(entries, endDate, goal, days = 14) {
  const dates = dateRange(endDate, days);
  const dateSet = new Set(dates);
  const series = dates.map((date) => ({ date, ...nutritionTotal(entriesOn(entries, date)) }));
  const loggedSeries = series.filter((day) => day.calories > 0);
  const divisor = loggedSeries.length || 1;
  const average = (key) => Math.round(loggedSeries.reduce((sum, day) => sum + day[key], 0) / divisor);
  const foods = new Map();

  entries.filter((entry) => dateSet.has(entry.loggedOn)).forEach((entry) => {
    const key = entry.name.trim().toLocaleLowerCase();
    const current = foods.get(key) || { name: entry.name.trim(), count: 0, calories: 0 };
    current.count += 1;
    current.calories += Number(entry.calories || 0);
    foods.set(key, current);
  });

  return {
    series,
    loggedDays: loggedSeries.length,
    averageCalories: average("calories"),
    averageProtein: average("protein"),
    averageCarbs: average("carbs"),
    averageFat: average("fat"),
    overTarget: loggedSeries.filter((day) => day.calories > goal.calories).length,
    totalEntries: entries.filter((entry) => dateSet.has(entry.loggedOn)).length,
    frequentFoods: Array.from(foods.values())
      .sort((left, right) => right.count - left.count || right.calories - left.calories)
      .slice(0, 5),
  };
}

export function formatMacro(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

