import test from "node:test";
import assert from "node:assert/strict";
import { coachedMealOptions, currentFoodCoaching, estimateRange, mealQuestion, safeAnalysisDate } from "../src/lib/foodCoach.js";
import { trendSummary } from "../src/lib/nutrition.js";

test("meal estimate ranges reject unknown and invalid values but preserve valid zero", () => {
  assert.equal(estimateRange(null), null);
  assert.equal(estimateRange({ min: null, max: 500 }), null);
  assert.equal(estimateRange({ min: 500, max: 200 }), null);
  assert.equal(estimateRange({ min: -2, max: 20 }), null);
  assert.equal(estimateRange({ min: 0, max: 0 }, "g"), "0 g");
  assert.equal(estimateRange({ min: 350, max: 550 }, "kcal"), "350–550 kcal");
});

test("meal handoff preserves selected log date and never claims the option was eaten", () => {
  const question = mealQuestion({ name: "Rice and dal", portion: "One cup of each", reason: "A familiar meal." }, "2026-10-01");
  assert.match(question, /2026-10-01/);
  assert.match(question, /One cup of each/);
  assert.match(question, /I have not eaten this suggestion; do not log it/);
});

test("missing or invalid review timestamps are not presented as a real review date", () => {
  assert.equal(safeAnalysisDate(null), null);
  assert.equal(safeAnalysisDate("not-a-date"), null);
  assert.ok(safeAnalysisDate("2026-10-01T10:00:00Z"));
});

test("trend averages exclude days with unknown macros, instead of creating zero protein", () => {
  const result = trendSummary([
    { name: "Dal", loggedOn: "2026-10-01", calories: 250, protein: 12, carbs: 40, fat: 5 },
    { name: "Lunch", loggedOn: "2026-10-02", calories: 500, protein: null, carbs: null, fat: null },
  ], "2026-10-02", { calories: 2200 });
  assert.equal(result.loggedDays, 2);
  assert.equal(result.averageCalories, 375);
  assert.equal(result.averageProtein, 12);
  assert.equal(result.proteinKnownDays, 1);
  assert.equal(result.partialNutrition, true);
  assert.equal(result.series.at(-1).protein, null);
});

test("AI advice must belong to the selected day and current verified profile", () => {
  const coaching = { profileVersion: 4, mealChoices: [] };
  const analysis = { date: "2026-10-01", profile: { version: 4 },
    intelligence: { date: "2026-10-01", foodCoaching: coaching } };
  assert.equal(currentFoodCoaching(analysis), coaching);
  assert.equal(currentFoodCoaching(analysis, false), null);
  assert.equal(currentFoodCoaching({ ...analysis, profile: { version: 5 } }), null);
  assert.equal(currentFoodCoaching({ ...analysis, date: "2026-10-02" }), null);
  assert.equal(currentFoodCoaching({ ...analysis, intelligence: { ...analysis.intelligence, interpretationStale: true } }), null);
});

test("AI meal choices use compatible IDs and do not refill an intentional empty selection", () => {
  const candidates = [{ id: "dal", reason: "Calculated reason" }, { id: "idli", reason: "Example reason" }];
  assert.deepEqual(coachedMealOptions(candidates, { mealChoices: [] }), []);
  assert.deepEqual(coachedMealOptions(candidates, { mealChoices: [{ id: "idli", reason: "Personalised reason" },
    { id: "unrecognised", reason: "Do not show this" }, { id: "idli", reason: "Duplicate" }] }),
  [{ id: "idli", reason: "Personalised reason" }]);
  assert.deepEqual(coachedMealOptions(candidates), candidates);
});
