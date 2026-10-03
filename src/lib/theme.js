export const themeOptions = ["light", "dark", "system"];
export const themeStorageKey = "mira-food-manager-appearance";
export function resolveTheme(preference, systemDark) {
  return preference === "dark" || preference !== "light" && systemDark ? "dark" : "light";
}
export function readThemePreference() {
  try { const value = window.localStorage.getItem(themeStorageKey); return themeOptions.includes(value) ? value : "system"; }
  catch { return "system"; }
}
export function applyTheme(preference = readThemePreference()) {
  const valid = themeOptions.includes(preference) ? preference : "system";
  const resolved = resolveTheme(valid, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = valid;
  return resolved;
}
export function saveThemePreference(preference) {
  const valid = themeOptions.includes(preference) ? preference : "system";
  try { window.localStorage.setItem(themeStorageKey, valid); } catch { /* The choice still works without storage. */ }
  applyTheme(valid);
  window.dispatchEvent(new Event("mira-theme-change"));
}
// Resolve before React renders, including login and public pages.
if (typeof window !== "undefined") {
  applyTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (document.documentElement.dataset.themePreference === "system") applyTheme("system");
  });
  window.addEventListener("storage", event => {
    if (event.key === themeStorageKey || event.key === null) { applyTheme(); window.dispatchEvent(new Event("mira-theme-change")); }
  });
}
