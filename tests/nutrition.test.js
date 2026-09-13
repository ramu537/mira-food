import assert from "node:assert/strict";
import test from "node:test";
import { entriesOn, macroEnergy, nutritionTotal, percentage, trendSummary } from "../src/lib/nutrition.js";

const entries = [
  { id: 1, name: "Masala oats", meal: "BREAKFAST", calories: 360, protein: 16, carbs: 54, fat: 9, loggedOn: "2026-09-12" },
  { id: 2, name: "Paneer wrap", meal: "LUNCH", calories: 540, protein: 28, carbs: 58, fat: 21, loggedOn: "2026-09-12" },
  { id: 3, name: "Masala oats", meal: "BREAKFAST", calories: 340, protein: 15, carbs: 52, fat: 8, loggedOn: "2026-09-13" },
];

test("entriesOn and nutritionTotal preserve logged values", () => {
  const day = entriesOn(entries, "2026-09-12");
  assert.equal(day.length, 2);
  assert.deepEqual(nutritionTotal(day), { calories: 900, protein: 44, carbs: 112, fat: 30 });
});

test("percentage handles empty goals and caps display values", () => {
  assert.equal(percentage(120, 100), 100);
  assert.equal(percentage(120, 100, 140), 120);
  assert.equal(percentage(5, 0), 0);
});

test("macroEnergy applies standard energy factors", () => {
  assert.deepEqual(macroEnergy({ protein: 25, carbs: 50, fat: 10 }), {
    total: 390,
    protein: 100,
    carbs: 200,
    fat: 90,
    proteinShare: 26,
    carbsShare: 51,
    fatShare: 23,
  });
});

test("trends average only logged days and keep missing days in the series", () => {
  const result = trendSummary(entries, "2026-09-13", { calories: 800 }, 4);
  assert.equal(result.series.length, 4);
  assert.equal(result.loggedDays, 2);
  assert.equal(result.averageCalories, 620);
  assert.equal(result.overTarget, 1);
  assert.equal(result.totalEntries, 3);
  assert.equal(result.frequentFoods[0].name, "Masala oats");
  assert.equal(result.frequentFoods[0].count, 2);
});
