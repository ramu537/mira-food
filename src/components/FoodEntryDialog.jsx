import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { mealTypes } from "../lib/nutrition";
import { defaultEatingTime, foodGroupDefinitions, nutrientDefinitions, nutrientPayload } from "../lib/foodTimeline";

function blankEntry(date, meal, timeZone) {
  const time = defaultEatingTime(date, timeZone);
  return { name: "", meal: meal || "", calories: "", protein: "", carbs: "", fat: "", loggedOn: date, ...time, eatenTime: time.eatenTime || "", nutritionEstimated: true, estimationNote: "", nutrientValues: {}, nutrientEstimates: {}, foodGroups: [] };
}

function validMacro(value) {
  if (value === "") return true;
  const numeric = Number(value);
  const decimalPlaces = String(value).split(".")[1]?.length || 0;
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 99999.99 && decimalPlaces <= 2;
}

export default function FoodEntryDialog({ open, entry, date, initialMeal, earliestDate, today, timeZone = "Asia/Kolkata", busy, error, onClose, onSave }) {
  const ref = useRef(null);
  const writing = useRef(false);
  const [form, setForm] = useState(() => blankEntry(date, initialMeal, timeZone));
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    if (open && error) ref.current?.querySelector(".integration-error")?.scrollIntoView({ block: "nearest" });
  }, [open, error]);

  useEffect(() => {
    if (!open) return;
    setForm(entry ? {
      name: entry.name,
      meal: entry.meal,
      calories: String(entry.calories),
      protein: entry.protein == null ? '' : String(entry.protein),
      carbs: entry.carbs == null ? '' : String(entry.carbs),
      fat: entry.fat == null ? '' : String(entry.fat),
      loggedOn: entry.loggedOn,
      nutritionEstimated: Boolean(entry.nutritionEstimated),
      estimationNote: entry.estimationNote || "",
      eatenTime: entry.eatenTime?.slice(0, 5) || "",
      timeSource: entry.timeSource || "UNKNOWN",
      nutrientValues: Object.fromEntries(nutrientDefinitions.map(([key]) => [key, entry.nutrients?.[key]?.amount == null ? "" : String(entry.nutrients[key].amount)])),
      nutrientEstimates: Object.fromEntries(nutrientDefinitions.map(([key]) => [key, entry.nutrients?.[key]?.estimated !== false])),
      foodGroups: entry.foodGroups || [],
    } : blankEntry(date, initialMeal, timeZone));
    setAttempted(false);
  }, [date, entry, initialMeal, open, timeZone]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const caloriesValid = Number.isInteger(Number(form.calories)) && Number(form.calories) >= 1 && Number(form.calories) <= 20000;
  const dateValid = Boolean(form.loggedOn) && form.loggedOn >= earliestDate && form.loggedOn <= today;
  const valid = useMemo(() => (
    form.name.trim().length > 0
    && Number.isInteger(Number(form.calories))
    && Number(form.calories) >= 1
    && Number(form.calories) <= 20000
    && [form.protein, form.carbs, form.fat].every(validMacro)
    && form.loggedOn >= earliestDate
    && form.loggedOn <= today
    && (!form.meal || mealTypes.some((meal) => meal.value === form.meal))
    && (!form.eatenTime || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.eatenTime))
    && Object.values(form.nutrientValues).every(value => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 999999.99 && /^\d+(?:\.\d{0,2})?$/.test(value)))
  ), [earliestDate, form, today]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || writing.current) return;
    setAttempted(true);
    if (!valid) {
      const invalid = !form.name.trim() ? ref.current.querySelector('input[maxlength="120"]')
        : !caloriesValid ? ref.current.querySelector('.input-suffix input')
        : !dateValid ? ref.current.querySelector('input[type="date"]')
        : ref.current.querySelector(`input[name="${["protein", "carbs", "fat"].find(key => !validMacro(form[key]))}"]`) || ref.current.querySelector('input[aria-invalid="true"]');
      invalid?.focus();
      return;
    }
    writing.current = true;
    try { await onSave({
      name: form.name.trim(),
      meal: form.meal || null,
      calories: Number(form.calories),
      protein: form.protein === '' ? null : Number(form.protein),
      carbs: form.carbs === '' ? null : Number(form.carbs),
      fat: form.fat === '' ? null : Number(form.fat),
      loggedOn: form.loggedOn,
      nutritionEstimated: form.nutritionEstimated,
      estimationNote: form.nutritionEstimated ? form.estimationNote.trim() || null : null,
      eatenTime: form.eatenTime && entry?.eatenTime?.slice(0, 5) === form.eatenTime && entry.loggedOn === form.loggedOn && entry.timeSource === form.timeSource ? entry.eatenTime : form.eatenTime || null,
      timeSource: form.eatenTime ? form.timeSource === "UNKNOWN" ? "USER" : form.timeSource : "UNKNOWN",
      nutrients: Object.fromEntries(Object.entries(nutrientPayload(form.nutrientValues)).map(([key, value]) => [key, { ...value, estimated: form.nutrientEstimates[key] !== false }])),
      foodGroups: form.foodGroups,
    }); } finally { writing.current = false; }
  }

  return (
    <dialog
      ref={ref}
      className="dialog food-dialog" aria-labelledby="food-form-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === ref.current && !busy) onClose(); }}
    >
      <form className="dialog-card food-form" onSubmit={submit} noValidate onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
        <header className="dialog-header">
          <div><span className="eyebrow">Your food log</span><h2 id="food-form-title">{entry ? "Edit food" : "Log food"}</h2><p>Include the portion. Leave unknown macros blank; you can correct estimates any time.</p></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close food form"><X size={20} /></button>
        </header>

        <div className="form-body">
          {error && <p className="integration-error" role="alert">{error}</p>}
          <label className="field">
            <span>Food & portion</span>
            <input
              autoFocus
              required
              maxLength="120"
              placeholder="2 idli with 1 bowl sambar…"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              aria-invalid={attempted && !form.name.trim()}
            />
            {attempted && !form.name.trim() && <small className="field-error">Add a name for this food.</small>}
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Calories</span>
              <span className="input-suffix">
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="20000"
                  placeholder="320"
                  value={form.calories}
                  onChange={(event) => update("calories", event.target.value)}
                  aria-invalid={attempted && !caloriesValid} aria-describedby={attempted && !caloriesValid ? "food-calories-error" : undefined}
                />
                <span>kcal</span>
              </span>
              {attempted && !caloriesValid && <small className="field-error" id="food-calories-error" role="alert">Enter a whole number from 1 to 20,000 calories.</small>}
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" min={earliestDate} max={today} value={form.loggedOn} onChange={(event) => setForm(current => ({ ...current, loggedOn: event.target.value, eatenTime: "", timeSource: "UNKNOWN" }))} aria-invalid={attempted && !dateValid} aria-describedby={attempted && !dateValid ? "food-date-error" : undefined} />
              {attempted && !dateValid && <small className="field-error" id="food-date-error" role="alert">Choose a date between {earliestDate} and {today}.</small>}
            </label>
          </div>
          <label className="field food-time-field"><span>Time eaten <small>Optional · {timeZone}</small></span><input type="time" value={form.eatenTime} onChange={event => setForm(current => ({ ...current, eatenTime: event.target.value, timeSource: event.target.value ? "USER" : "UNKNOWN" }))} /><small>{form.timeSource === "LOGGED_NOW" ? "Defaulted to logging time; correct it if needed." : form.timeSource === "ESTIMATED" ? "AI-estimated time; you can correct it." : "Leave blank if you don’t remember. Changing the date clears the old time."}</small></label>

          <fieldset className="choice-fieldset">
            <legend>Macros <small>Optional, in grams</small></legend>
            <div className="form-grid form-grid--three">
              {[
                ["protein", "Protein"],
                ["carbs", "Carbs"],
                ["fat", "Fat"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input name={key} type="number" inputMode="decimal" min="0" max="99999.99" step="0.01" placeholder="Unknown" value={form[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={attempted && !validMacro(form[key])} />
                </label>
              ))}
            </div>
            {attempted && ![form.protein, form.carbs, form.fat].every(validMacro) && <small className="field-error">Use zero or a positive value with up to two decimal places.</small>}
          </fieldset>
          <label className="food-estimate-toggle">
            <input type="checkbox" checked={form.nutritionEstimated} onChange={(event) => update("nutritionEstimated", event.target.checked)} />
            <span>Nutrition or portion is estimated</span>
          </label>
          {form.nutritionEstimated && <label className="field">
            <span>Estimate details <small>Optional</small></span>
            <input maxLength="500" placeholder="Assumed one medium bowl; nutrition estimated" value={form.estimationNote} onChange={(event) => update("estimationNote", event.target.value)} />
          </label>}
          <details className="entry-options"><summary>Vitamins, minerals & food detail <span>Optional</span></summary>
            <p className="food-detail-hint">Amounts are for this whole portion, not per 100 g. Unknown stays blank. Keep AI estimates labelled; uncheck only for values from a label or reliable measurement.</p>
            <div className="food-nutrient-editor">{nutrientDefinitions.map(([key, label, unit]) => <div key={key}>
              <label className="field"><span>{label} <small>{unit}</small></span><input type="number" inputMode="decimal" min="0" max="999999.99" step="0.01" placeholder="Unknown" value={form.nutrientValues[key] || ""} onChange={event => update("nutrientValues", { ...form.nutrientValues, [key]: event.target.value })} aria-invalid={attempted && Boolean(form.nutrientValues[key]) && (!/^\d+(?:\.\d{0,2})?$/.test(form.nutrientValues[key]) || Number(form.nutrientValues[key]) > 999999.99)} /></label>
              {form.nutrientValues[key] !== undefined && form.nutrientValues[key] !== "" && <label className="food-estimate-toggle"><input type="checkbox" checked={form.nutrientEstimates[key] !== false} onChange={event => update("nutrientEstimates", { ...form.nutrientEstimates, [key]: event.target.checked })} /><span>Estimated</span></label>}
            </div>)}</div>
            {attempted && Object.values(form.nutrientValues).some(value => value !== "" && (!/^\d+(?:\.\d{0,2})?$/.test(value) || Number(value) > 999999.99)) && <p className="field-error" role="alert">Nutrient amounts must be non-negative numbers with up to two decimals, at most 999,999.99.</p>}
            <fieldset className="choice-fieldset"><legend>Foods in this portion <small>Optional</small></legend><div className="food-group-pills">{foodGroupDefinitions.map(([key, label]) => <button className={form.foodGroups.includes(key) ? "is-present" : ""} type="button" key={key} aria-pressed={form.foodGroups.includes(key)} onClick={() => update("foodGroups", form.foodGroups.includes(key) ? form.foodGroups.filter(group => group !== key) : [...form.foodGroups, key])}>{label}</button>)}</div></fieldset>
            <label className="field"><span>Meal label <small>Optional · not used as an eating time</small></span><select value={form.meal || ""} onChange={event => update("meal", event.target.value)}><option value="">No preference</option>{mealTypes.map(meal => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</select></label>
          </details>
        </div>

        <footer className="dialog-actions form-actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : entry ? "Save changes" : "Log food"}</button>
        </footer>
      </form>
    </dialog>
  );
}
