export function normalizeCapture(capture) {
  const requestedDate = capture.captureDate;
  const content = capture.text ?? capture.content ?? "";
  return {
    text: requestedDate ? `Selected journal date: ${requestedDate}. Use an explicit date in the user's description if supplied.\n${content}` : content,
    capturedAt: capture.capturedAt || new Date().toISOString(),
    timeZone: capture.timeZone || "Asia/Kolkata",
    source: capture.source || "WEB",
    targetDomain: capture.targetDomain || capture.metadata?.targetDomain || null,
  };
}
