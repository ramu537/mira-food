import { Camera, ChevronDown, Clock3, Plus, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { foodCapturePayload, quickFoodPayload, recentFoodTemplates } from "../lib/dailyFood";
import { captureApi } from "../api/captures";
import { capturePhase } from "../lib/captureUi";

const emptyForm = { name: "", calories: "", meal: "", eatenTime: "", protein: "", carbs: "", fat: "", nutritionEstimated: true, estimationNote: "" };

export default function QuickFoodLog({ entries, date, today, timeZone, busy, onSave, onRefresh, onPhoto }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nameRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [provider, setProvider] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const refresh = useRef(onRefresh);
  const writing = useRef(false);
  const intent = useRef(null);
  useEffect(() => {
    let stopped = false;
    captureApi.providerStatus().then(value => { if (!stopped) setProvider(value); }).catch(() => {});
    return () => { stopped = true; };
  }, []);
  useEffect(() => { refresh.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    const pending = jobs.filter(job => capturePhase(job.result) === "processing" && !job.paused);
    if (!pending.length) return;
    let stopped = false, timer;
    async function poll() {
      if (stopped) return;
      if (document.visibilityState !== "visible") { timer = window.setTimeout(poll, 5000); return; }
      const updates = await Promise.all(pending.map(async job => {
        if (Date.now() - job.started > 15 * 60 * 1000) return { ...job, paused: true };
        try { return { ...job, result: await captureApi.organization(job.id), error: "" }; }
        catch (failure) { return { ...job, error: failure.message || "Progress unavailable. Your description is already saved." }; }
      }));
      if (stopped) return;
      setJobs(current => current.map(job => updates.find(update => update.id === job.id) || job));
      if (updates.some(job => capturePhase(job.result) === "complete")) {
        try { Promise.resolve(refresh.current?.()).catch(() => {}); } catch { /* A refresh cannot undo a successful log. */ }
      }
    }
    // Poll batches of saved captures; a pending meal must never block logging another.
    timer = window.setTimeout(poll, 3000);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [jobs]);
  const recent = useMemo(() => recentFoodTemplates(entries), [entries]);
  useEffect(() => { setForm((current) => ({ ...emptyForm, meal: current.meal })); setError(""); }, [date]);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };
  function reuse(item) {
    setForm({ name: item.name, meal: item.meal, eatenTime: "", calories: String(item.calories), protein: String(item.protein ?? ""), carbs: String(item.carbs ?? ""), fat: String(item.fat ?? ""), nutrients: item.nutrients, foodGroups: item.foodGroups, nutritionEstimated: Boolean(item.nutritionEstimated), estimationNote: item.estimationNote || "" });
    setError(""); nameRef.current?.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || capturing || writing.current) return;
    if (!String(form.calories).trim()) {
      if (!form.name.trim()) { setError("Tell us what you ate. Calories are optional."); nameRef.current?.focus(); return; }
      let payload;
      try { payload = foodCapturePayload(form, date, timeZone); }
      catch (failure) { setError(failure.message); return; }
      const signature = JSON.stringify({ form, date, timeZone });
      if (intent.current?.signature !== signature) intent.current = { signature, requestId: crypto.randomUUID(), payload: { ...payload, capturedAt: new Date().toISOString() } };
      writing.current = true; setCapturing(true); setError("");
      try {
        const saved = await captureApi.create(intent.current.payload, intent.current.requestId);
        intent.current = null;
        setJobs(current => [...current.filter(job => capturePhase(job.result) !== "complete").slice(-49), { id: saved.id, result: null, started: Date.now(), paused: false, error: "" }]);
        setForm(current => ({ ...emptyForm, meal: current.meal })); setDetailsOpen(false);
      } catch (failure) { setError(`${failure.message || "Could not confirm the save."} Retry the same description to reuse its save reference.`); }
      finally { writing.current = false; setCapturing(false); }
      return;
    }
    let payload;
    try { payload = quickFoodPayload(form, date, timeZone); }
    catch (failure) { setError(failure.message); return; }
    const signature = JSON.stringify({ form, date, timeZone });
    if (intent.current?.signature !== signature) intent.current = { signature, payload };
    writing.current = true;
    try {
      const saved = await onSave(intent.current.payload);
      if (saved) { intent.current = null; setForm((current) => ({ ...emptyForm, meal: current.meal })); setDetailsOpen(false); setError(""); nameRef.current?.focus(); }
    } catch (failure) { setError(failure.message || "Could not save. Your entry is still here."); }
    finally { writing.current = false; }
  }
  async function retryJob(job) {
    if (writing.current || busy) return;
    writing.current = true; setCapturing(true);
    try {
      if (["failed", "review"].includes(capturePhase(job.result))) await captureApi.organize(job.id);
      setJobs(current => current.map(item => item.id === job.id ? { ...item, result: null, started: Date.now(), paused: false, error: "" } : item));
    } catch (failure) {
      setJobs(current => current.map(item => item.id === job.id ? { ...item, error: failure.message } : item));
    } finally { writing.current = false; setCapturing(false); }
  }
  return <section className="quick-log" aria-labelledby="quick-log-title">
    <header><div><h2 id="quick-log-title">Add to your day</h2><p>Describe your food. Mira handles the nutrition.</p></div><span className="quick-log-time"><Clock3 size={14} />{date === today ? "Defaults to now" : "Time optional"}</span></header>
    {provider?.configured === false && <p className="quick-log-capture" role="status">Automatic AI processing is currently unavailable. Your description can still be saved for your connected assistant to process. If you already know the calories, optional manual entry saves directly.</p>}
    <form onSubmit={submit} noValidate onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <div className="quick-log__main">
        <label><span className="sr-only">What did you eat?</span><input ref={nameRef} maxLength="3000" placeholder="2 rotis, dal and curd at 1:30 pm…" value={form.name} onChange={(event) => update("name", event.target.value)} disabled={busy || capturing} /></label>
        <button className="quick-photo" type="button" onClick={onPhoto} disabled={busy || capturing} aria-label="Log food from a photo" title="Add a food photo"><Camera size={20} /></button>
        <button className="button button--primary" type="submit" disabled={busy || capturing}>{form.calories ? <Plus size={17} /> : <Sparkles size={17} />}{busy || capturing ? "Saving…" : "Log food"}</button>
      </div>
      <button className="quick-details-toggle" type="button" aria-controls="quick-food-details" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}><ChevronDown size={16} /> Time & nutrition · optional</button>
      <div id="quick-food-details" hidden={!detailsOpen}>
      {detailsOpen && <label className="quick-time"><span>Eating time · optional</span><input type="time" value={form.eatenTime} onChange={event => update("eatenTime", event.target.value)} disabled={busy || capturing} /><small>{timeZone} · a time in your description takes priority</small></label>}
      {detailsOpen && <label className="quick-calories"><span>Calories · optional, if known</span><span><input type="number" inputMode="numeric" min="1" max="20000" step="1" placeholder="Leave blank for AI" value={form.calories} onChange={(event) => update("calories", event.target.value)} disabled={busy || capturing} /><small>kcal</small></span></label>}
      {detailsOpen && <div className="quick-macros">{[["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]].map(([key, label]) => <label key={key}><span>{label}</span><span><input type="number" inputMode="decimal" min="0" max="99999.99" step="0.01" placeholder="Unknown" disabled={busy || capturing} value={form[key]} onChange={(event) => update(key, event.target.value)} /><small>g</small></span></label>)}</div>}
      {detailsOpen && <label className="food-estimate-toggle"><input type="checkbox" disabled={busy || capturing} checked={form.nutritionEstimated} onChange={(event) => update("nutritionEstimated", event.target.checked)} /><span>Nutrition or portion is estimated</span></label>}
      </div>
      {error && <p className="quick-log__error" role="alert">{error}</p>}
    </form>
    {!!jobs.length && <details className="quick-captures"><summary>{jobs.filter(job => capturePhase(job.result) !== "complete").length ? "Saved captures · processing and retry status" : "Recent capture receipts"} ({jobs.length})</summary>
    {jobs.map(job => {
      const phase = capturePhase(job.result);
      return <div key={job.id} className="quick-log-capture" role="status">
        <p>{phase === "complete" ? job.result.receipt?.summary || "Food added. Nutrition estimates are labelled in your log."
          : phase === "failed" || phase === "review" ? "Your description is saved, but AI could not finish. Retry this capture—do not log it again."
          : job.paused ? "Your description is saved. Processing is taking longer; check progress when ready."
          : "Saved. AI is adding the food and estimating nutrition. Keep logging; your log will refresh when ready."} <small>Capture #{job.id}</small></p>
        {job.error && <p>{job.error}</p>}
        {(["failed", "review"].includes(phase) || job.paused) && <button className="button button--secondary" type="button" disabled={busy || capturing} onClick={() => retryJob(job)}>Check / retry saved capture</button>}
      </div>;
    })}
    </details>}
    {!!recent.length && <div className="recent-foods"><span><RotateCcw size={14} /> Recently logged</span><div>{recent.map((item) => <button type="button" disabled={busy || capturing} key={item.name.toLocaleLowerCase()} onClick={() => reuse(item)} title={`Prepare ${item.name} for logging`}><strong>{item.name}</strong><small>{Number(item.calories).toLocaleString("en-IN")} kcal</small></button>)}</div></div>}
  </section>;
}
