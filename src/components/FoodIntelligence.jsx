import { ArrowUpRight, MapPin, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { goalLabel } from "../lib/foodProfile";
import { formatMacro } from "../lib/nutrition";
import { shortDate } from "../lib/dates";

export default function FoodIntelligence({ manager }) {
  const { analysis, analysisLoading: loading, analysisError: error, refreshAnalysis } = manager;
  if (!analysis) return <section className="panel intelligence-state" aria-busy={loading}><div><Sparkles size={19} /><h2>Food intelligence</h2></div>
    {error ? <><p role="alert">Your food log is still available. Guidance could not be refreshed; no meal advice is shown without your current safety preferences.</p><button className="button button--secondary" type="button" onClick={refreshAnalysis} disabled={loading}><RefreshCw size={16} />Retry analysis</button></> : <p role="status">Updating your logged totals and meal ideas…</p>}</section>;
  const { day, week, nextMeal, profile, targets, targetsConfigured, safetyMode } = analysis;
  return <section className="food-intelligence" aria-label="Food intelligence" aria-busy={loading}>
    <div className="intelligence-toolbar"><span><Sparkles size={16} />Food intelligence <small>From your records</small></span><button className="food-text-button" type="button" onClick={refreshAnalysis} disabled={loading}><RefreshCw size={15} />{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="food-context-strip"><Link to="/settings"><span>Working on</span><strong>{goalLabel(profile.goal)}</strong><ArrowUpRight size={15} /></Link><Link to="/settings"><MapPin size={15} />{nextMeal.location}{nextMeal.locationDefaulted && <small>Example location · change</small>}</Link></div>
    {!!analysis.notices.length && <details className="food-analysis-notices" open={safetyMode !== "GENERAL" || undefined}><summary><ShieldCheck size={16} />{safetyMode === "GENERAL" ? "What to keep in mind" : "Your care needs come first"}</summary><ul>{analysis.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul></details>}
    <div className="intelligence-grid">
      <article className="intake-summary"><span className="eyebrow">What you’ve eaten · recorded only</span><div className="intake-number"><strong>{day.totals.calories.toLocaleString("en-IN")}</strong><span>kcal logged</span></div>
        <dl className="intake-macros">{[["Protein", day.totals.protein], ["Carbs", day.totals.carbs], ["Fat", day.totals.fat]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatMacro(value)} <small>g</small></dd></div>)}</dl>
        <p>{day.summary}</p>
        {targetsConfigured && safetyMode === "GENERAL" && <div className="intake-reference"><span>Saved reference</span><strong>{targets.calories.toLocaleString("en-IN")} kcal · {targets.protein} g protein</strong></div>}
        {!targetsConfigured && <p className="intake-reference">No personal numeric target set. Log first; customise whenever you want.</p>}
      </article>
      <article className="next-meal-panel"><header><div><span className="eyebrow">A useful next step</span><h2>{nextMeal.title}</h2></div><Link className="food-text-link" to="/settings">Personalise <ArrowUpRight size={15} /></Link></header>
        {manager.selectedDate !== manager.today && <p className="food-analysis-date-note">Ideas based on {shortDate(manager.selectedDate)}, using your current preferences.</p>}
        <p>{nextMeal.guidance}</p>
        <ol className="next-meal-list">{nextMeal.ideas.map((idea, index) => <li key={idea.name}><span className="meal-idea-number">0{index + 1}</span><div><h3>{idea.name}</h3><p>{idea.detail}</p><small>{idea.reason}</small></div></li>)}</ol>
        <p className="meal-availability-note">{nextMeal.availabilityNote}</p>
      </article>
    </div>
    <article className="weekly-food-strip"><div><span className="eyebrow">This week · {shortDate(week.start)}–{shortDate(week.end)}</span><h2>{week.loggedDays ? `${week.loggedDays} days with records` : "No weekly pattern yet"}</h2><p>{week.summary}</p></div>
      <div className="weekly-food-days" aria-label="Recorded-day coverage">{week.days.map((day) => <div key={day.date} title={`${shortDate(day.date)}: ${day.entries ? `${day.totals.calories} kcal recorded` : "not recorded"}`}><span className={day.entries ? "is-recorded" : ""}>{day.entries ? "✓" : "—"}</span><small>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</small></div>)}</div>
    </article>
    <details className="food-analysis-method"><summary>How this works & sources</summary><p>This is source-backed guidance, not a diagnosis or a personalised medical diet. Your connected AI uses the same analysis tool. It refreshes after food changes; external writes are checked while this tab is visible.</p><p>Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: analysis.timeZone }).format(new Date(analysis.generatedAt))} · {analysis.timeZone}</p><ul>{analysis.assumptions.map((item) => <li key={item}>{item}</li>)}</ul><div>{analysis.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={13} /></a>)}</div></details>
  </section>;
}
