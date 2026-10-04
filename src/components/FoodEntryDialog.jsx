import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { mealTypes } from "../lib/nutrition";
import MealIcon from "./MealIcon";

function blankEntry(date, meal) {
  return { name: "", meal: meal || "BREAKFAST", calories: "", protein: "", carbs: "", fat: "", loggedOn: date, nutritionEstimated: true, estimationNote: "" };
}

function validMacro(value) {
  if (value === "") return true;
  const numeric = Number(value);
  const decimalPlaces = String(value).split(".")[1]?.length || 0;
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 99999.99 && decimalPlaces <= 2;
}

export default function FoodEntryDialog({ open, entry, date, initialMeal, earliestDate, today, busy, error, onClose, onSave }) {
  const ref = useRef(null);
  const [form, setForm] = useState(() => blankEntry(date, initialMeal));
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
    } : blankEntry(date, initialMeal));
    setAttempted(false);
  }, [date, entry, initialMeal, open]);

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
    && mealTypes.some((meal) => meal.value === form.meal)
  ), [earliestDate, form, today]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    if (!valid) {
      const invalid = !form.name.trim() ? ref.current.querySelector('input[maxlength="120"]')
        : !caloriesValid ? ref.current.querySelector('.input-suffix input')
        : !dateValid ? ref.current.querySelector('input[type="date"]')
        : ref.current.querySelector(`input[name="${["protein", "carbs", "fat"].find(key => !validMacro(form[key]))}"]`);
      invalid?.focus();
      return;
    }
    await onSave({
      name: form.name.trim(),
      meal: form.meal,
      calories: Number(form.calories),
      protein: form.protein === '' ? null : Number(form.protein),
      carbs: form.carbs === '' ? null : Number(form.carbs),
      fat: form.fat === '' ? null : Number(form.fat),
      loggedOn: form.loggedOn,
      nutritionEstimated: form.nutritionEstimated,
      estimationNote: form.nutritionEstimated ? form.estimationNote.trim() || null : null,
    });
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

          <fieldset className="choice-fieldset">
            <legend>Meal</legend>
            <div className="meal-choices">
              {mealTypes.map((meal) => (
                <button
                  key={meal.value}
                  type="button"
                  className={form.meal === meal.value ? "meal-choice is-selected" : "meal-choice"}
                  onClick={() => update("meal", meal.value)}
                  aria-pressed={form.meal === meal.value}
                >
                  <MealIcon meal={meal.value} size="small" />
                  <span><strong>{meal.label}</strong><small>{meal.hint}</small></span>
                  {form.meal === meal.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </fieldset>

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
              <input type="date" min={earliestDate} max={today} value={form.loggedOn} onChange={(event) => update("loggedOn", event.target.value)} aria-invalid={attempted && !dateValid} aria-describedby={attempted && !dateValid ? "food-date-error" : undefined} />
              {attempted && !dateValid && <small className="field-error" id="food-date-error" role="alert">Choose a date between {earliestDate} and {today}.</small>}
            </label>
          </div>

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
        </div>

        <footer className="dialog-actions form-actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : entry ? "Save changes" : "Log food"}</button>
        </footer>
      </form>
    </dialog>
  );
}
