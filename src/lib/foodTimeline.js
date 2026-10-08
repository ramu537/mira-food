import { dateInZone } from "./foodProfile.js";

export const nutrientDefinitions = [
  ["fiber", "Fibre", "g"], ["sodium", "Sodium", "mg"], ["calcium", "Calcium", "mg"],
  ["iron", "Iron", "mg"], ["potassium", "Potassium", "mg"], ["zinc", "Zinc", "mg"],
  ["vitaminA", "Vitamin A", "µg RAE"], ["vitaminC", "Vitamin C", "mg"],
  ["vitaminD", "Vitamin D", "µg"], ["vitaminB12", "Vitamin B12", "µg"],
];
export const foodGroupDefinitions = [
  ["VEGETABLE", "Vegetables"], ["FRUIT", "Fruit"], ["PROTEIN", "Protein foods"],
  ["WHOLE_GRAIN", "Whole grains"], ["CALCIUM_RICH", "Calcium-rich foods"],
];

export function localTime(now = new Date(), timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}
export function defaultEatingTime(date, timeZone, now = new Date()) {
  return date === dateInZone(now, timeZone || "Asia/Kolkata")
    ? { eatenTime: localTime(now, timeZone), timeSource: "LOGGED_NOW" }
    : { eatenTime: null, timeSource: "UNKNOWN" };
}
export function eatingTimeLabel(value) {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return "Time not recorded";
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
}
export function chronologicalFoods(entries = []) {
  const seconds = value => {
    if (!value) return 0;
    const [hour, minute, second = 0] = value.split(":").map(Number);
    return hour * 3600 + minute * 60 + second;
  };
  return [...entries].sort((a, b) => {
    if (!!a.eatenTime !== !!b.eatenTime) return a.eatenTime ? -1 : 1;
    return seconds(a.eatenTime) - seconds(b.eatenTime) || Number(a.id) - Number(b.id);
  });
}
export function nutrientNumber(value) {
  return value == null ? "—" : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
export function nutrientPayload(values = {}, previous = {}) {
  const result = { ...previous };
  for (const [key] of nutrientDefinitions) {
    if (!(key in values)) continue;
    const raw = String(values[key] ?? "").trim();
    if (!raw) { delete result[key]; continue; }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0 || amount > 999999.99 || !/^\d+(?:\.\d{0,2})?$/.test(raw))
      throw new Error("Nutrient amounts must be non-negative numbers with up to two decimals.");
    result[key] = { amount, estimated: previous[key]?.estimated !== false };
  }
  return result;
}
