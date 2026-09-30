import { mealTypes } from "./nutrition.js";

export function groupedMeals(entries = []) {
  return mealTypes.map((meal) => ({
    ...meal,
    entries: entries.filter((entry) => entry.meal === meal.value),
  }));
}

export function recentFoodTemplates(entries = [], limit = 5) {
  const seen = new Set();
  return [...entries]
    .sort((left, right) => String(right.loggedOn).localeCompare(String(left.loggedOn)) || Number(right.id || 0) - Number(left.id || 0))
    .filter((entry) => {
      const key = String(entry.name || "").trim().toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ id: _id, loggedOn: _loggedOn, ...entry }) => entry);
}

export function quickFoodPayload(form, loggedOn) {
  const name = String(form.name || "").trim();
  const calories = Number(form.calories);
  const meal = String(form.meal || "");
  const rawMacros = ["protein", "carbs", "fat"].map((key) => String(form[key] ?? "").trim());
  const macros = rawMacros.map((value) => Number(value || 0));
  if (!name || name.length > 120) throw new Error("Add a food and portion (up to 120 characters).");
  if (!Number.isInteger(calories) || calories < 1 || calories > 20000) throw new Error("Calories must be a whole number from 1 to 20,000.");
  if (!mealTypes.some((item) => item.value === meal)) throw new Error("Choose a meal.");
  const invalidMacro = macros.some((value, index) => !Number.isFinite(value) || value < 0 || value > 99999.99 || !/^\d*(?:\.\d{0,2})?$/.test(rawMacros[index]));
  if (invalidMacro) throw new Error("Macros must be positive numbers with up to two decimal places.");
  return { name, calories, meal, protein: macros[0], carbs: macros[1], fat: macros[2], loggedOn };
}
