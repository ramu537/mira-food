import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function GoalDialog({ open, goal, busy, onClose, onSave }) {
  const ref = useRef(null);
  const [form, setForm] = useState(goal);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) { setForm(goal); setAttempted(false); }
  }, [open]); // Snapshot only when opened; background MCP refreshes must not erase an in-progress form.

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const valid = useMemo(() => {
    if (!form) return false;
    const integer = (value) => Number.isInteger(Number(value));
    return integer(form.calories) && Number(form.calories) >= 500 && Number(form.calories) <= 10000
      && integer(form.protein) && Number(form.protein) >= 0 && Number(form.protein) <= 1000
      && integer(form.carbs) && Number(form.carbs) >= 0 && Number(form.carbs) <= 1500
      && integer(form.fat) && Number(form.fat) >= 0 && Number(form.fat) <= 500
      && integer(form.waterGlasses) && Number(form.waterGlasses) >= 1 && Number(form.waterGlasses) <= 20;
  }, [form]);

  if (!form) return null;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setAttempted(true);
    if (!valid) return;
    await onSave(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])));
  }

  return (
    <dialog
      ref={ref}
      className="dialog goal-dialog"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === ref.current && !busy) onClose(); }}
    >
      <form className="dialog-card goal-form" onSubmit={submit} noValidate>
        <header className="dialog-header">
          <div><span className="eyebrow">Personal targets</span><h2>Nutrition goals</h2><p>Use targets that suit you. This workspace does not provide medical advice.</p></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close goals form"><X size={20} /></button>
        </header>
        <div className="form-body">
          <label className="field">
            <span>Daily calories</span>
            <span className="input-suffix"><input required type="number" inputMode="numeric" step="1" min="500" max="10000" value={form.calories} onChange={(event) => update("calories", event.target.value)} /><span>kcal</span></span>
          </label>
          <div className="form-grid form-grid--three">
            {[["protein", "Protein", 1000], ["carbs", "Carbs", 1500], ["fat", "Fat", 500]].map(([key, label, max]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <span className="input-suffix"><input required type="number" inputMode="numeric" step="1" min="0" max={max} value={form[key]} onChange={(event) => update(key, event.target.value)} /><span>g</span></span>
              </label>
            ))}
          </div>
          <label className="field">
            <span>Water target</span>
            <span className="input-suffix"><input required type="number" inputMode="numeric" step="1" min="1" max="20" value={form.waterGlasses} onChange={(event) => update("waterGlasses", event.target.value)} /><span>glasses</span></span>
          </label>
          {attempted && !valid && <p className="form-error" role="alert">Check that every target is inside the allowed range.</p>}
        </div>
        <footer className="dialog-actions form-actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save goals"}</button>
        </footer>
      </form>
    </dialog>
  );
}
