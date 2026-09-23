import assert from "node:assert/strict";
import test from "node:test";
import { dateInZone, emptyFoodProfile, profileForm, profilePayload } from "../src/lib/foodProfile.js";

test("empty preferences never invent body measurements or a real location", () => {
  const value = profilePayload(profileForm({}));
  assert.equal(value.city, null);
  assert.equal(value.country, null);
  assert.equal(value.heightCm, null);
  assert.equal(value.weightKg, null);
  assert.equal(value.gender, null);
  assert.equal(value.timeZone, "Asia/Kolkata");
  assert.equal(value.version, 0);
  assert.deepEqual(value.allergies, []);
});
test("profile version is retained so a stale form cannot silently overwrite a newer profile", () => {
  assert.equal(profilePayload(profileForm({ version: 8, allergies: ["MILK"] })).version, 8);
});
test("profile payload converts only numeric fields and preserves care instructions", () => {
  const value = profilePayload({ ...emptyFoodProfile, weightKg: "72.5", age: "30", healthContext: "  Typhoid recovery  ", allergies: ["MILK"] });
  assert.equal(value.weightKg, 72.5);
  assert.equal(value.age, 30);
  assert.equal(value.healthContext, "Typhoid recovery");
  assert.deepEqual(value.allergies, ["MILK"]);
  assert.equal("calories" in value, false);
});
test("the saved time zone determines the food day across UTC midnight", () => {
  const time = new Date("2026-09-19T20:00:00Z");
  assert.equal(dateInZone(time), "2026-09-20");
  assert.equal(dateInZone(time, "America/New_York"), "2026-09-19");
});
