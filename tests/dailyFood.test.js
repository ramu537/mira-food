import assert from "node:assert/strict";
import test from "node:test";
import { foodCapturePayload, groupedMeals, quickFoodPayload, recentFoodTemplates } from "../src/lib/dailyFood.js";

const entries = [
  { id: 1, name: "Idli", meal: "BREAKFAST", calories: 220, protein: 7, carbs: 42, fat: 3, loggedOn: "2026-09-27" },
  { id: 3, name: "Idli", meal: "BREAKFAST", calories: 240, protein: 8, carbs: 44, fat: 3, loggedOn: "2026-09-29" },
  { id: 2, name: "Dal rice", meal: "LUNCH", calories: 520, protein: 18, carbs: 82, fat: 12, loggedOn: "2026-09-28" },
];

test("description-only capture needs no calorie or macro form", () => {
  const value = foodCapturePayload({ name: "Lunch: 2 rotis and dal", meal: "DINNER" }, "2026-10-04");
  assert.equal(value.targetDomain, "FOOD");
  assert.equal(value.captureDate, "2026-10-04");
  assert.match(value.text, /Lunch: 2 rotis and dal/);
  assert.match(value.text, /Fallback meal/);
  assert.doesNotMatch(value.text, /User-provided nutrition/);
  assert.equal("calories" in value, false);
});

test("capture preserves supplied zero nutrition without inventing unknown values", () => {
  const value = foodCapturePayload({ name: "Tea", meal: "SNACK", fat: "0", protein: "" }, "2026-10-04");
  assert.match(value.text, /fat: 0 g/);
  assert.doesNotMatch(value.text, /protein:/);
  assert.throws(() => foodCapturePayload({ name: "Tea", meal: "SNACK", fat: "-1" }, "2026-10-04"), /non-negative/);
});

test("recent templates use the newest version and deduplicate names", () => {
  const recent = recentFoodTemplates(entries);
  assert.deepEqual(recent.map((item) => item.name), ["Idli", "Dal rice"]);
  assert.equal(recent[0].calories, 240);
  assert.equal("id" in recent[0], false);
  assert.equal("loggedOn" in recent[0], false);
});

test("daily groups retain the four meal order and their entries", () => {
  const groups = groupedMeals(entries.filter((entry) => entry.loggedOn === "2026-09-29"));
  assert.deepEqual(groups.map((group) => group.value), ["BREAKFAST", "LUNCH", "SNACK", "DINNER"]);
  assert.equal(groups[0].entries[0].name, "Idli");
  assert.equal(groups[1].entries.length, 0);
});

test("quick payload trims food and preserves unknown macros rather than inventing zeros", () => {
  assert.deepEqual(quickFoodPayload({ name: "  Dosa with chutney ", meal: "DINNER", calories: "410", protein: "", carbs: "", fat: "" }, "2026-09-29"),
    { name: "Dosa with chutney", meal: "DINNER", calories: 410, protein: null, carbs: null, fat: null, loggedOn: "2026-09-29", nutritionEstimated: true, estimationNote: null });
  assert.throws(() => quickFoodPayload({ name: "Tea", meal: "SNACK", calories: "" }, "2026-09-29"), /Calories/);
  assert.throws(() => quickFoodPayload({ name: "Tea", meal: "SNACK", calories: "40", protein: "1.234" }, "2026-09-29"), /two decimal places/);
});

test("reusing food preserves estimate assumptions and measured values can clear them", () => {
  const template = recentFoodTemplates([{ ...entries[0], nutritionEstimated: true, estimationNote: "Assumed 2 medium idli" }])[0];
  const reused = quickFoodPayload(template, "2026-09-29");
  assert.equal(reused.nutritionEstimated, true);
  assert.equal(reused.estimationNote, "Assumed 2 medium idli");
  const measured = quickFoodPayload({ ...template, nutritionEstimated: false }, "2026-09-29");
  assert.equal(measured.estimationNote, null);
});
