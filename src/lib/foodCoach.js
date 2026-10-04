/** Advice opens a draft in the existing assistant; it never writes a food record. */
export function askFoodCoach(question, contextDate) {
  window.dispatchEvent(new CustomEvent("mira:ask-food", { detail: { question, contextDate } }));
}

export function mealQuestion(idea, date) {
  return `Help me decide whether ${idea.name} would be a useful next meal based on my food log for ${date} and my current saved preferences.`
    + (idea.portion ? ` Suggested portion: ${idea.portion}.` : "")
    + (idea.reason ? ` The meal suggestion says: ${idea.reason}` : "")
    + " Explain what fits, suggest an easy alternative if needed, and distinguish nutrition estimates from known facts. I have not eaten this suggestion; do not log it.";
}

export function estimateRange(value, unit = "") {
  if (!value || value.min == null || value.max == null) return null;
  const minimum = Number(value.min), maximum = Number(value.max);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < minimum) return null;
  const format = number => number.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  return (minimum === maximum ? format(minimum) : `${format(minimum)}–${format(maximum)}`) + (unit ? ` ${unit}` : "");
}

export function currentFoodCoaching(analysis, preferencesCurrent = true) {
  const ai = analysis?.intelligence;
  const coaching = ai?.foodCoaching;
  return preferencesCurrent && coaching && ai.date === analysis.date && !ai.interpretationStale
    && Number(coaching.profileVersion) === Number(analysis.profile?.version) ? coaching : null;
}

export function coachedMealOptions(candidates = [], coaching = null) {
  const options = Array.isArray(candidates) ? candidates : [];
  if (!coaching) return options.slice(0, 3);
  // An intentionally empty AI selection can signal a care-context conflict. Do not refill it.
  const seen = new Set();
  return (Array.isArray(coaching.mealChoices) ? coaching.mealChoices : []).flatMap(choice => {
    const idea = options.find(item => item.id === choice.id);
    if (!idea || seen.has(idea.id)) return [];
    seen.add(idea.id);
    return [{ ...idea, reason: choice.reason || idea.reason }];
  }).slice(0, 3);
}

export function safeAnalysisDate(value, timeZone = "Asia/Kolkata") {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date); }
  catch { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
}
