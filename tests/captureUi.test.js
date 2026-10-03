import test from "node:test";
import assert from "node:assert/strict";
import { capturePhase, validateCaptureImages } from "../src/lib/captureUi.js";
test("accepted captures are processing, not prematurely reported as completed", () => {
  assert.equal(capturePhase({ workStatus: "PENDING", captureStatus: "PROCESSING" }), "processing");
  assert.equal(capturePhase({ receipt: { undoneAt: null } }), "complete");
  assert.equal(capturePhase({ workStatus: "FAILED" }), "failed");
  assert.equal(capturePhase({ workStatus: "NEEDS_REVIEW" }), "review");
});
test("attachment bounds match the supported image formats and batch limits", () => {
  const image = { type: "image/jpeg", size: 1024 };
  assert.deepEqual(validateCaptureImages([image]), [image]);
  assert.throws(() => validateCaptureImages([{ type: "image/svg+xml", size: 1024 }]));
  assert.throws(() => validateCaptureImages([{ type: "image/png", size: 6 * 1024 * 1024 }]));
  assert.throws(() => validateCaptureImages([image, image, image, image]));
  assert.throws(() => validateCaptureImages(Array.from({ length: 3 }, () => ({ type: "image/png", size: 5 * 1024 * 1024 }))));
});
