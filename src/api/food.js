import { apiRequest } from "./client";

export const foodApi = {
  async analyze(date, regenerate = false) {
    const [calculated, intelligence] = await Promise.allSettled([
      apiRequest(`/food/analysis?${new URLSearchParams({ date })}`),
      regenerate ? apiRequest("/food/intelligence/refresh", { method: "POST", body: JSON.stringify({ date }) })
        : apiRequest(`/food/intelligence?${new URLSearchParams({ date })}`),
    ]);
    if (calculated.status === "rejected") throw calculated.reason;
    return { ...calculated.value, intelligence: intelligence.status === "fulfilled" ? intelligence.value : {
      status: "UNAVAILABLE", providerMessage: intelligence.reason?.message || "AI interpretation could not be loaded."
    }};
  },
  getProfile() { return apiRequest("/food/profile"); },
  updateProfile(profile) { return apiRequest("/food/profile", { method: "PUT", body: JSON.stringify(profile) }); },
  listEntries(start, end) {
    return apiRequest(`/food/entries?${new URLSearchParams({ start, end })}`);
  },
  createEntry(entry) {
    return apiRequest("/food/entries", { method: "POST", body: JSON.stringify(entry) });
  },
  updateEntry(id, entry) {
    return apiRequest(`/food/entries/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(entry),
    });
  },
  removeEntry(id) {
    return apiRequest(`/food/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  getGoal() {
    return apiRequest("/food/goal");
  },
  updateGoal(goal) {
    return apiRequest("/food/goal", { method: "PUT", body: JSON.stringify(goal) });
  },
  listWater(start, end) {
    return apiRequest(`/food/water?${new URLSearchParams({ start, end })}`);
  },
  setWater(date, glasses) {
    return apiRequest(`/food/water/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ glasses }),
    });
  },
};
