export function normalizeCapture(capture) {
  const requestedDate = capture.captureDate;
  return {
    text: capture.text ?? capture.content ?? "",
    capturedAt: capture.capturedAt || (requestedDate ? `${requestedDate}T12:00:00+05:30` : new Date().toISOString()),
    timeZone: capture.timeZone || "Asia/Kolkata",
    source: capture.source || "WEB",
    targetDomain: capture.targetDomain || capture.metadata?.targetDomain || null,
  };
}
