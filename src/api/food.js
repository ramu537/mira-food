import { apiRequest } from "./client";

export const foodApi = {
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

