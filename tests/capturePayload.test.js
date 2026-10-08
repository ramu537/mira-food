import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCapture } from "../src/lib/capture.js";

test("capture preserves supplied text, date, timezone and dedicated target", () => {
  assert.deepEqual(normalizeCapture({ content: "My record", captureDate: "2026-10-02", capturedAt: "2026-10-07T09:00:00Z", metadata: { targetDomain: "FOOD" } }), {
    text: "Selected journal date: 2026-10-02. Use an explicit date in the user's description if supplied.\nMy record", capturedAt: "2026-10-07T09:00:00Z",
    timeZone: "Asia/Kolkata", source: "WEB", targetDomain: "FOOD",
  });
});

test("capture creation timestamp never fabricates a noon eating time on a historical date", () => {
  const before = Date.now();
  const result = normalizeCapture({ text: "Rice", captureDate: "2020-01-01", targetDomain: "FOOD" });
  assert.ok(Date.parse(result.capturedAt) >= before);
  assert.match(result.text, /Selected journal date: 2020-01-01/);
});

test("explicit capture fields override compatibility aliases", () => {
  const value = normalizeCapture({ text: "Original", content: "Ignored", capturedAt: "2026-10-02T09:00:00Z",
    timeZone: "UTC", source: "WEB", targetDomain: "EXPERIENCE", metadata: { targetDomain: "DIARY" } });
  assert.equal(value.text, "Original");
  assert.equal(value.capturedAt, "2026-10-02T09:00:00Z");
  assert.equal(value.targetDomain, "EXPERIENCE");
  assert.equal(value.timeZone, "UTC");
});
