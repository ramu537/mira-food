import { apiRequest } from "./client";

export const memoryApi = {
  search: ({ query, domains, startDate, endDate, limit = 10 }) => {
    return apiRequest("/memory/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        domains: domains && domains.length > 0 ? domains : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
      }),
    });
  },
  getSource: (domain, entityId) => {
    return apiRequest(`/memory/sources/${encodeURIComponent(domain)}/${encodeURIComponent(entityId)}`);
  },
};
