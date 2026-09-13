import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, shiftDate } from "../src/lib/dates.js";

test("shiftDate crosses month and leap-year boundaries", () => {
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDate("2028-02-29", 1), "2028-03-01");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
});

test("dateRange ends on the requested day", () => {
  assert.deepEqual(dateRange("2026-09-13", 4), ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"]);
});

