export const foodGoals = [["BALANCED", "Everyday balance"], ["STRENGTH", "Build strength / gym"], ["WEIGHT_GAIN", "Support weight gain"], ["WEIGHT_MANAGEMENT", "Manage weight"], ["RECOVERY", "Illness or recovery"], ["CUSTOM", "My own goal"]];
export const foodDiets = [["NOT_SET", "Not specified"], ["VEGETARIAN", "Vegetarian"], ["VEGAN", "Vegan"], ["EGGETARIAN", "Vegetarian + eggs"], ["OMNIVORE", "Includes meat / fish"]];
export const foodAllergens = [["MILK", "Milk / dairy"], ["EGG", "Egg"], ["PEANUT", "Peanut"], ["TREE_NUT", "Tree nuts"], ["SOY", "Soy"], ["WHEAT", "Wheat"], ["FISH", "Fish"], ["SHELLFISH", "Shellfish"], ["SESAME", "Sesame"]];
export const emptyFoodProfile = { city: "", country: "", timeZone: "Asia/Kolkata", age: "", heightCm: "", weightKg: "", gender: "", goal: "BALANCED", goalNotes: "", diet: "NOT_SET", activityLevel: "NOT_SET", lifeStage: "NOT_SET", allergies: [], otherAvoidances: "", healthContext: "", clinicianAdvice: "", version: 0 };
export function profileForm(value) {
  return Object.fromEntries(Object.entries(emptyFoodProfile).map(([key, fallback]) => [key, value?.[key] ?? fallback]));
}
export function profilePayload(value) {
  return Object.fromEntries(Object.keys(emptyFoodProfile).map((key) => {
    const field = value[key];
    if (["age", "heightCm", "weightKg"].includes(key)) return [key, field === "" || field == null ? null : Number(field)];
    return [key, typeof field === "string" ? field.trim() || null : field];
  }));
}
export function dateInZone(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const field = (type) => parts.find((part) => part.type === type).value;
  return `${field("year")}-${field("month")}-${field("day")}`;
}
export function goalLabel(value) { return foodGoals.find(([key]) => key === value)?.[1] || "Everyday balance"; }
