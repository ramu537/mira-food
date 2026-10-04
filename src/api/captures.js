import { apiBlobRequest, apiRequest } from "./client";

import { normalizeCapture } from "../lib/capture.js";

export const captureApi = {
  providerStatus: () => apiRequest("/captures/provider-status"),
  create: (capture, requestId) => apiRequest("/captures", {
    method: "POST",
    ...(requestId ? { headers: { "Idempotency-Key": requestId } } : {}),
    body: JSON.stringify(normalizeCapture(capture)),
  }),
  createWithImages: (capture, files, requestId) => {
    const form = new FormData();
    form.append("capture", new Blob([JSON.stringify(normalizeCapture(capture))], { type: "application/json" }));
    files.forEach((file) => form.append("files", file, file.name));
    return apiRequest("/captures/with-attachments", { method: "POST", body: form, ...(requestId ? { headers: { "Idempotency-Key": requestId } } : {}) });
  },
  get: (id) => apiRequest(`/captures/${id}`),
  organize: (id) => apiRequest(`/captures/${id}/organize`, { method: "POST" }),
  organization: (id) => apiRequest(`/captures/${id}/organization`),
  image: (captureId, attachmentId) => apiBlobRequest(`/captures/${captureId}/attachments/${attachmentId}`),
};
