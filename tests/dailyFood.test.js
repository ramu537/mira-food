import assert from "node:assert/strict";
import test from "node:test";
import { groupedMeals, quickFoodPayload, recentFoodTemplates } from "../src/lib/dailyFood.js";

const entries = [
  { id: 1, name: "Idli", meal: "BREAKFAST", calories: 220, protein: 7, carbs: 42, fat: 3, loggedOn: "2026-09-27" },
  { id: 3, name: "Idli", meal: "BREAKFAST", calories: 240, protein: 8, carbs: 44, fat: 3, loggedOn: "2026-09-29" },
  { id: 2, name: "Dal rice", meal: "LUNCH", calories: 520, protein: 18, carbs: 82, fat: 12, loggedOn: "2026-09-28" },
];

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

test("quick payload trims food and safely defaults unknown macros to zero", () => {
  assert.deepEqual(quickFoodPayload({ name: "  Dosa with chutney ", meal: "DINNER", calories: "410", protein: "", carbs: "", fat: "" }, "2026-09-29"),
    { name: "Dosa with chutney", meal: "DINNER", calories: 410, protein: 0, carbs: 0, fat: 0, loggedOn: "2026-09-29", nutritionEstimated: true, estimationNote: null });
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
