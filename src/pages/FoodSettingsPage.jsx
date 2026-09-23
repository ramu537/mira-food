import { ArrowLeft, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import { foodApi } from "../api/food";
import { emptyFoodProfile, foodAllergens, foodDiets, foodGoals, profileForm, profilePayload } from "../lib/foodProfile";

function Select({ label, value, options, onChange }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>;
}
function Text({ label, value, onChange, multiline = false, ...props }) {
  const Input = multiline ? "textarea" : "input";
  return <label className="field"><span>{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

export default function FoodSettingsPage({ onSave, onEditTargets }) {
  const [form, setForm] = useState(null), [baseline, setBaseline] = useState("");
  const [error, setError] = useState(""), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const live = useRef(false), lock = useRef(false);
  const dirty = Boolean(form && JSON.stringify(form) !== baseline);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (busy) { blocker.reset(); setError("Please wait for your preferences to finish saving before leaving."); }
    else if (window.confirm("Leave without saving these preference changes?")) blocker.proceed();
    else blocker.reset();
  }, [blocker, busy]);
  useEffect(() => {
    let active = true; live.current = true;
    setError(""); setForm(null);
    foodApi.getProfile().then((value) => {
      if (!active) return;
      const next = profileForm(value); setForm(next); setBaseline(JSON.stringify(next));
    }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; live.current = false; };
  }, [attempt]);
  useEffect(() => {
    const guard = (event) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSaved(false); };
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    try { new Intl.DateTimeFormat("en", { timeZone: form.timeZone || "Asia/Kolkata" }).format(); }
    catch { setError("Use a valid time zone such as Asia/Kolkata."); return; }
    lock.current = true; setBusy(true); setError(""); setSaved(false);
    try {
      const next = profileForm(await onSave(profilePayload(form)));
      if (live.current) { setForm(next); setBaseline(JSON.stringify(next)); setSaved(true); }
    } catch (failure) { if (live.current) setError(failure.message); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  if (!form) return <section className="panel food-settings-state">{error ? <><p role="alert">Your saved preferences could not be loaded. {error}</p><button className="button button--secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></> : <p role="status">Loading your food preferences…</p>}</section>;
  return <div className="food-settings-page">
    <Link className="food-text-link" to="/"><ArrowLeft size={16} />Daily log</Link>
    <header className="page-heading"><div><span className="eyebrow">Personal, not prescriptive</span><h1>Goals & preferences</h1><p>Everything is optional. You can log food without completing a profile.</p></div></header>
    <form onSubmit={submit} className="food-settings-form">
      <fieldset disabled={busy}>
        <section className="panel settings-section"><header><h2>What would you like to work on?</h2><p>Your goal guides suggestions. It does not automatically change your calorie or macro targets.</p></header>
          <Select label="Current goal" value={form.goal} options={foodGoals} onChange={(value) => update("goal", value)} />
          <Text label="In your own words" value={form.goalNotes} maxLength={500} multiline rows={3} placeholder="For example: starting the gym and building strength" onChange={(value) => update("goalNotes", value)} />
          <div className="form-grid form-grid--two"><Select label="Diet preference" value={form.diet} options={foodDiets} onChange={(value) => update("diet", value)} />
            <Select label="Activity" value={form.activityLevel} options={[["NOT_SET", "Not specified"], ["LIGHT", "Mostly sitting / light activity"], ["MODERATE", "Regular moderate activity"], ["ACTIVE", "Active / regular training"]]} onChange={(value) => update("activityLevel", value)} /></div>
          <button className="button button--secondary" type="button" onClick={onEditTargets}><SlidersHorizontal size={16} />Edit numeric targets separately</button>
        </section>
        <section className="panel settings-section"><header><h2>Food where you live</h2><p>Without a location, meal ideas use Hyderabad, India as a labelled example. No location tracking.</p></header>
          <div className="form-grid form-grid--two"><Text label="City" value={form.city} maxLength={100} placeholder="Hyderabad" onChange={(value) => update("city", value)} /><Text label="Country" value={form.country} maxLength={100} placeholder="India" onChange={(value) => update("country", value)} /></div>
          <Text label="Time zone" value={form.timeZone} maxLength={60} placeholder="Asia/Kolkata" onChange={(value) => update("timeZone", value)} />
        </section>
        <section className="panel settings-section"><header><h2>About you <small>Optional</small></h2><p>Useful context for your connected assistant. These details alone cannot determine a safe diet or diagnose a condition.</p></header>
          <div className="form-grid form-grid--three"><Text label="Age (years)" value={form.age} type="number" min={1} max={120} step={1} onChange={(value) => update("age", value)} /><Text label="Height (cm)" value={form.heightCm} type="number" min={30} max={250} step={0.1} onChange={(value) => update("heightCm", value)} /><Text label="Weight (kg)" value={form.weightKg} type="number" min={2} max={500} step={0.1} onChange={(value) => update("weightKg", value)} /></div>
          <div className="form-grid form-grid--two"><Select label="Gender" value={form.gender} options={[["", "Not specified"], ["FEMALE", "Woman"], ["MALE", "Man"], ["NON_BINARY", "Non-binary"], ["PREFER_NOT_TO_SAY", "Prefer not to say"]]} onChange={(value) => update("gender", value)} />
            <Select label="Pregnancy / breastfeeding" value={form.lifeStage} options={[["NOT_SET", "Not specified"], ["NONE", "Neither"], ["PREGNANT", "Pregnant"], ["BREASTFEEDING", "Breastfeeding"]]} onChange={(value) => update("lifeStage", value)} /></div>
        </section>
        <section className="panel settings-section"><header><h2>Foods to avoid & care needs</h2><p>These take priority over your goal. Not selecting an allergy does not establish that a meal is safe.</p></header>
          <fieldset className="allergy-options"><legend>Known food allergies</legend>{foodAllergens.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.allergies.includes(value)} onChange={(event) => update("allergies", event.target.checked ? [...form.allergies, value] : form.allergies.filter((item) => item !== value))} />{label}</label>)}</fieldset>
          <Text label="Other allergies, intolerances or restrictions" value={form.otherAvoidances} maxLength={500} multiline rows={2} onChange={(value) => update("otherAvoidances", value)} />
          <Text label="Health or recovery context you want to share" value={form.healthContext} maxLength={1000} multiline rows={3} placeholder="Optional—for example, recovering from an illness under medical care" onChange={(value) => update("healthContext", value)} />
          <Text label="Your clinician’s food instructions" value={form.clinicianAdvice} maxLength={1000} multiline rows={3} placeholder="Only instructions they have actually given you" onChange={(value) => update("clinicianAdvice", value)} />
          <p className="food-care-note"><ShieldCheck size={18} />Illness, recovery, pregnancy and under-18 profiles pause general meal recommendations. Keep logging, but get an individual plan from a clinician or dietitian.</p>
          <p className="settings-privacy">Saved to your private Mira account and available to your connected AI tools for nutrition help. Only share health details you want stored; clear them and save to remove them from this profile.</p>
          <button type="button" className="food-text-button" onClick={() => { if (window.confirm("Clear this profile’s fields? Nothing changes on the server until you save.")) { setForm({ ...emptyFoodProfile, allergies: [], version: form.version }); setSaved(false); } }}>Clear profile fields</button>
        </section>
      </fieldset>
      <footer className="settings-save-bar"><div>{error ? <><p className="form-error" role="alert">{error}</p><button type="button" className="food-text-button" disabled={busy} onClick={() => { if (window.confirm("Reload saved preferences and replace this unsaved draft? Copy any changes you want to keep first.")) setAttempt((value) => value + 1); }}>Reload saved preferences</button></> : <p role="status">{busy ? "Saving…" : saved ? "Preferences saved. Food guidance is refreshing." : dirty ? "Unsaved changes" : "Your preferences are up to date."}</p>}</div><button className="button button--primary" type="submit" disabled={busy || !dirty}><Save size={16} />Save preferences</button></footer>
    </form>
  </div>;
}
