import { ChevronDown, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { quickFoodPayload, recentFoodTemplates } from "../lib/dailyFood";
import { mealTypes } from "../lib/nutrition";

const emptyForm = { name: "", calories: "", meal: "BREAKFAST", protein: "", carbs: "", fat: "" };

export default function QuickFoodLog({ entries, date, busy, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nameRef = useRef(null);
  const recent = useMemo(() => recentFoodTemplates(entries), [entries]);
  useEffect(() => { setForm((current) => ({ ...emptyForm, meal: current.meal })); setError(""); }, [date]);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };
  function reuse(item) {
    setForm({ name: item.name, meal: item.meal, calories: String(item.calories), protein: String(item.protein || ""), carbs: String(item.carbs || ""), fat: String(item.fat || "") });
    setError(""); nameRef.current?.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    let payload;
    try { payload = quickFoodPayload(form, date); }
    catch (failure) { setError(failure.message); return; }
    const saved = await onSave(payload);
    if (saved) { setForm((current) => ({ ...emptyForm, meal: current.meal })); setDetailsOpen(false); setError(""); nameRef.current?.focus(); }
  }
  return <section className="quick-log" aria-labelledby="quick-log-title">
    <header><div><h2 id="quick-log-title">Quick log</h2><p>Food, portion and an estimate are enough.</p></div></header>
    <form onSubmit={submit} noValidate>
      <div className="quick-log__main">
        <label><span>Food & portion</span><input ref={nameRef} maxLength="120" placeholder="2 idli with sambar" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label className="quick-calories"><span>Calories</span><span><input type="number" inputMode="numeric" min="1" max="20000" step="1" placeholder="320" value={form.calories} onChange={(event) => update("calories", event.target.value)} /><small>kcal</small></span></label>
        <button className="button button--primary" type="submit" disabled={busy}><Plus size={17} />{busy ? "Saving…" : "Log"}</button>
      </div>
      <fieldset className="quick-meals"><legend>Meal</legend>{mealTypes.map((meal) => <button key={meal.value} type="button" className={form.meal === meal.value ? "is-selected" : ""} aria-pressed={form.meal === meal.value} onClick={() => update("meal", meal.value)}>{meal.label}</button>)}</fieldset>
      <button className="quick-details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}><ChevronDown size={16} /> Optional nutrition details</button>
      {detailsOpen && <div className="quick-macros">{[["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]].map(([key, label]) => <label key={key}><span>{label}</span><span><input type="number" inputMode="decimal" min="0" max="99999.99" step="0.01" placeholder="0" value={form[key]} onChange={(event) => update(key, event.target.value)} /><small>g</small></span></label>)}</div>}
      {error && <p className="quick-log__error" role="alert">{error}</p>}
    </form>
    {!!recent.length && <div className="recent-foods"><span><RotateCcw size={14} /> Recently logged</span><div>{recent.map((item) => <button type="button" key={item.name.toLocaleLowerCase()} onClick={() => reuse(item)} title={`Prepare ${item.name} for logging`}><strong>{item.name}</strong><small>{Number(item.calories).toLocaleString("en-IN")} kcal</small></button>)}</div></div>}
  </section>;
}
