import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCapture } from "../src/lib/capture.js";

test("capture preserves supplied text, date, timezone and dedicated target", () => {
  assert.deepEqual(normalizeCapture({ content: "My record", captureDate: "2026-10-02", metadata: { targetDomain: "INVESTMENT" } }), {
    text: "My record", capturedAt: "2026-10-02T12:00:00+05:30",
    timeZone: "Asia/Kolkata", source: "WEB", targetDomain: "INVESTMENT",
  });
});

test("explicit capture fields override compatibility aliases", () => {
  const value = normalizeCapture({ text: "Original", content: "Ignored", capturedAt: "2026-10-02T09:00:00Z",
    timeZone: "UTC", source: "WEB", targetDomain: "EXPERIENCE", metadata: { targetDomain: "DIARY" } });
  assert.equal(value.text, "Original");
  assert.equal(value.capturedAt, "2026-10-02T09:00:00Z");
  assert.equal(value.targetDomain, "EXPERIENCE");
  assert.equal(value.timeZone, "UTC");
});
