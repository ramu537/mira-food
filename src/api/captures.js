import { apiBlobRequest, apiRequest } from "./client";

export const captureApi = {
  create: (capture) => apiRequest("/captures", {
    method: "POST",
    body: JSON.stringify(capture),
  }),
  createWithImages: (capture, files) => {
    const form = new FormData();
    form.append("capture", new Blob([JSON.stringify(capture)], { type: "application/json" }));
    files.forEach((file) => form.append("files", file, file.name));
    return apiRequest("/captures/with-attachments", { method: "POST", body: form });
  },
  get: (id) => apiRequest(`/captures/${id}`),
  organize: (id) => apiRequest(`/captures/${id}/organize`, { method: "POST" }),
  organization: (id) => apiRequest(`/captures/${id}/organization`),
  image: (captureId, attachmentId) => apiBlobRequest(`/captures/${captureId}/attachments/${attachmentId}`),
};
