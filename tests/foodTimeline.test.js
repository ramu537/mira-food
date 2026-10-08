import test from "node:test";
import assert from "node:assert/strict";
import { chronologicalFoods, defaultEatingTime, eatingTimeLabel, nutrientPayload, nutrientDefinitions } from "../src/lib/foodTimeline.js";

test("today defaults to local logging time; historical foods remain untimed", () => {
  const now = new Date("2026-10-07T00:10:00Z");
  assert.deepEqual(defaultEatingTime("2026-10-07", "Asia/Kolkata", now), { eatenTime: "05:40", timeSource: "LOGGED_NOW" });
  assert.deepEqual(defaultEatingTime("2026-10-06", "Asia/Kolkata", now), { eatenTime: null, timeSource: "UNKNOWN" });
  assert.deepEqual(defaultEatingTime("2026-10-06", "America/Los_Angeles", now), { eatenTime: "17:10", timeSource: "LOGGED_NOW" });
});
test("timeline is chronological, keeps equal-time records, and places legacy foods after known times", () => {
  const foods = [{ id: 7, eatenTime: null }, { id: 5, eatenTime: "13:30" }, { id: 3, eatenTime: "08:00:00" }, { id: 2, eatenTime: "13:30" }];
  assert.deepEqual(chronologicalFoods(foods).map(food => food.id), [3, 2, 5, 7]);
  assert.deepEqual(foods.map(food => food.id), [7, 5, 3, 2]);
  assert.equal(eatingTimeLabel("00:05"), "12:05 am");
  assert.equal(eatingTimeLabel("13:30:00"), "1:30 pm");
  assert.equal(eatingTimeLabel(null), "Time not recorded");
  assert.deepEqual(chronologicalFoods([{ id: 2, eatenTime: "08:00" }, { id: 1, eatenTime: "08:00:00" }]).map(food => food.id), [1, 2]);
});
test("optional nutrients distinguish measured zero from unknown and preserve estimate provenance", () => {
  assert.deepEqual(nutrientPayload({ fiber: "0", calcium: "125.5", iron: "" }, { iron: { amount: 2, estimated: true }, calcium: { amount: 100, estimated: false } }), {
    fiber: { amount: 0, estimated: true }, calcium: { amount: 125.5, estimated: false },
  });
  assert.throws(() => nutrientPayload({ fiber: "-1" }), /non-negative/);
  assert.throws(() => nutrientPayload({ iron: "1.234" }), /two decimals/);
  assert.throws(() => nutrientPayload({ iron: "Infinity" }), /non-negative/);
  assert.equal(nutrientDefinitions.find(([key]) => key === "vitaminA")[2], "µg RAE");
});
