import { mealTypes } from "./nutrition.js";
import { defaultEatingTime } from "./foodTimeline.js";

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
    .map(({ id: _id, loggedOn: _loggedOn, eatenTime: _time, timeSource: _timeSource, ...entry }) => entry);
}

export function quickFoodPayload(form, loggedOn, timeZone = "Asia/Kolkata") {
  const name = String(form.name || "").trim();
  const calories = Number(form.calories);
  const meal = String(form.meal || "");
  const rawMacros = ["protein", "carbs", "fat"].map((key) => String(form[key] ?? "").trim());
  const macros = rawMacros.map((value) => value === "" ? null : Number(value));
  if (!name || name.length > 120) throw new Error("Add a food and portion (up to 120 characters).");
  if (!Number.isInteger(calories) || calories < 1 || calories > 20000) throw new Error("Calories must be a whole number from 1 to 20,000.");
  if (meal && !mealTypes.some((item) => item.value === meal)) throw new Error("Unsupported meal label.");
  const invalidMacro = macros.some((value, index) => value !== null && (!Number.isFinite(value) || value < 0 || value > 99999.99 || !/^\d*(?:\.\d{0,2})?$/.test(rawMacros[index])));
  if (invalidMacro) throw new Error("Macros must be positive numbers with up to two decimal places.");
  const nutritionEstimated = form.nutritionEstimated !== false;
  if (form.eatenTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.eatenTime)) throw new Error("Choose a valid eating time.");
  const timing = form.eatenTime ? { eatenTime: form.eatenTime, timeSource: "USER" } : defaultEatingTime(loggedOn, timeZone);
  return { name, calories, meal: meal || null, protein: macros[0], carbs: macros[1], fat: macros[2], loggedOn, ...timing,
    ...(form.nutrients ? { nutrients: form.nutrients } : {}), ...(form.foodGroups ? { foodGroups: form.foodGroups } : {}),
    nutritionEstimated, estimationNote: nutritionEstimated ? String(form.estimationNote || "").trim() || null : null };
}

/** The natural-language path never needs nutrition numbers from the user. */
export function foodCapturePayload(form, captureDate, timeZone = "Asia/Kolkata") {
  const name = String(form.name || "").trim();
  if (!name || name.length > 3000) throw new Error("Describe what you ate (up to 3,000 characters). Calories are optional.");
  if (form.meal && !mealTypes.some(meal => meal.value === form.meal)) throw new Error("Unsupported meal label.");
  const supplied = ["protein", "carbs", "fat"].flatMap(key => {
    const text = String(form[key] ?? "").trim();
    if (!text) return [];
    const amount = Number(text);
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999.99 || !/^\d*(?:\.\d{0,2})?$/.test(text)) {
      throw new Error("Optional nutrition values must be non-negative numbers with up to two decimal places.");
    }
    return [`${key}: ${amount} g`];
  });
  const timing = form.eatenTime ? { eatenTime: form.eatenTime, timeSource: "USER" } : defaultEatingTime(captureDate, timeZone);
  if (timing.eatenTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timing.eatenTime)) throw new Error("Choose a valid eating time.");
  return { targetDomain: "FOOD", captureDate, timeZone,
    text: (form.meal ? `Fallback meal if the description does not specify one: ${form.meal}\n` : "")
      + (timing.eatenTime ? `Fallback eatenTime: ${timing.eatenTime}; timeSource: ${timing.timeSource}. Explicit times in the description override this fallback.\n` : "No fallback eating time; leave it unknown unless stated in the description.\n")
      + name
      + (supplied.length ? `\nUser-provided nutrition for the whole portion: ${supplied.join("; ")}` : "") };
}
