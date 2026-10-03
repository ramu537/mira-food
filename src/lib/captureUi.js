export const acceptedCaptureImages = ["image/jpeg", "image/png", "image/webp"];
export function validateCaptureImages(files) {
  if (files.length > 3) throw new Error("Choose up to 3 images.");
  if (files.some(file => !acceptedCaptureImages.includes(file.type))) throw new Error("Use JPG, PNG or WebP images.");
  if (files.some(file => file.size <= 0 || file.size > 5 * 1024 * 1024)) throw new Error("Each image must be non-empty and 5 MB or smaller.");
  if (files.reduce((sum, file) => sum + file.size, 0) > 12 * 1024 * 1024) throw new Error("Keep the combined images within 12 MB.");
  return files;
}
export function capturePhase(result) {
  if (result?.receipt && !result.receipt.undoneAt || result?.captureStatus === "RESOLVED") return "complete";
  if (["FAILED", "CANCELLED"].includes(result?.workStatus) || ["FAILED", "ARCHIVED"].includes(result?.captureStatus)) return "failed";
  if (result?.workStatus === "NEEDS_REVIEW" || result?.captureStatus === "NEEDS_REVIEW") return "review";
  return "processing";
}
export function captureToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return [parts.year, parts.month, parts.day].join("-");
}
