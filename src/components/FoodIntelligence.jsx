import { ArrowUpRight, MapPin, MessageCircle, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { goalLabel } from "../lib/foodProfile";
import { formatMacro } from "../lib/nutrition";
import { shortDate } from "../lib/dates";
import { askFoodCoach, coachedMealOptions, currentFoodCoaching, estimateRange, mealQuestion, safeAnalysisDate } from "../lib/foodCoach";

function MealOption({ idea, index, date, onAsk }) {
  const nutrition = idea.estimatedNutrition;
  const calories = estimateRange(nutrition?.calories, "kcal");
  const protein = estimateRange(nutrition?.protein, "g protein");
  return <li className="food-meal-option">
    <header><span className="food-option-number" aria-hidden="true">{index + 1}</span><h4>{idea.name}</h4></header>
    {idea.portion && <p className="food-option-portion">{idea.portion}</p>}
    {idea.reason && <p className="food-option-reason">{idea.reason}</p>}
    {(calories || protein) && <div className="food-option-nutrition"><span>Estimated</span>{calories && <strong>{calories}</strong>}{protein && <strong>{protein}</strong>}</div>}
    {idea.alternative && <p className="food-option-alternative"><strong>Easy swap</strong> {idea.alternative}</p>}
    {(idea.detail || nutrition?.assumptions?.length || idea.allergens?.length || nutrition?.carbs || nutrition?.fat) && <details className="food-option-details"><summary>Ingredients & estimate details</summary>
      {idea.detail && <p>{idea.detail}</p>}
      {nutrition && <p className="food-option-estimate">{[estimateRange(nutrition.carbs, "g carbs"), estimateRange(nutrition.fat, "g fat")].filter(Boolean).join(" · ")}</p>}
      {nutrition?.assumptions && <p>{Array.isArray(nutrition.assumptions) ? nutrition.assumptions.join(" ") : nutrition.assumptions}</p>}
      {!!idea.allergens?.length && <p>Recipe may include: {idea.allergens.map(value => String(value).toLowerCase().replaceAll("_", " ")).join(", ")}. Check ingredients and cross-contact with the cook or vendor.</p>}
    </details>}
    <button className="food-text-button food-option-ask" type="button" onClick={() => onAsk(mealQuestion(idea, date))}><MessageCircle size={16} />Ask about this<ArrowUpRight size={14} /></button>
  </li>;
}

export default function FoodIntelligence({ manager, onNavigate }) {
  const { analysis, analysisLoading: loading, analysisError: error, analysisStale: stale, refreshAnalysis } = manager;
  const ask = question => { onNavigate?.(); askFoodCoach(question, manager.selectedDate); };
  if (!analysis) return <section className="panel intelligence-state" aria-busy={loading}><div><Sparkles size={19} /><h3>Your food coach</h3></div>
    {error ? <><p role="alert">Your food log is still available. {error}</p><button className="button button--secondary" type="button" onClick={() => refreshAnalysis(true)} disabled={loading}><RefreshCw size={16} />Retry guidance</button></> : <p role="status">Looking through your food log and preparing useful next steps…</p>}
    <button className="food-text-button" type="button" onClick={() => ask("Help me choose a practical next meal using my available food records and saved preferences. Explain any assumptions.")}><MessageCircle size={16} />Ask your food coach</button>
  </section>;

  const { day, week, nextMeal, profile, targets, targetsConfigured, safetyMode, briefing, weeklyCoaching } = analysis;
  const currentAdvice = manager.analysisAdviceCurrent !== false;
  const coverage = analysis.nutritionCoverage;
  const recorded = day.entries > 0;
  const entries = manager.entries.filter(entry => entry.loggedOn === analysis.date);
  const macro = key => {
    const known = coverage?.[key + "KnownEntries"] ?? entries.filter(entry => entry[key] != null).length;
    return known > 0 ? formatMacro(day.totals[key]) : "—";
  };
  const updatedAt = safeAnalysisDate(analysis.generatedAt, analysis.timeZone);
  const ai = analysis.intelligence;
  const coaching = currentFoodCoaching(analysis, currentAdvice);
  const aiUpdatedAt = safeAnalysisDate(ai?.assistantGeneratedAt, analysis.timeZone);
  const ideas = coachedMealOptions(nextMeal?.ideas, coaching);
  const notices = analysis.notices || [];
  return <section className="food-intelligence food-coach" aria-label="Food coaching" aria-busy={loading}>
    <div className="intelligence-toolbar"><span><Sparkles size={16} />Your food coach <small>{loading ? "Updating" : stale ? "Previous review" : "Based on your records"}</small></span><button className="food-text-button" type="button" onClick={() => refreshAnalysis(true)} disabled={loading}><RefreshCw size={15} />{loading ? "Refreshing…" : "Refresh"}</button></div>
    {(stale || error) && <div className="food-coach-freshness" role={error ? "alert" : "status"}><p>{error ? "Refresh did not finish. Your last review is kept below; it may not include recent changes." : "Updating your review. The previous recorded totals remain available below."}{updatedAt && <small>Last calculated {updatedAt}.</small>}</p></div>}
    {!currentAdvice && <div className="food-coach-freshness" role="status"><p>Your preferences may have changed. Personalised advice is hidden until a fresh review uses your current restrictions. Your previous recorded totals are still available.</p></div>}

    <div className="food-coach-context"><Link to="/settings" onClick={onNavigate}><span>{goalLabel(profile?.goal)}</span><ArrowUpRight size={14} /></Link><Link to="/settings" onClick={onNavigate}><MapPin size={14} />{nextMeal?.location || "Your location"}{nextMeal?.locationDefaulted && <small>Example location</small>}</Link></div>
    {currentAdvice && <article className="food-coach-briefing"><span className="eyebrow">{coaching ? "AI daily briefing · based on your records" : "Your daily briefing · immediate guidance"}</span><h3>{briefing?.headline || (recorded ? "Make your next meal work for you" : "Start with what you’ve eaten")}</h3>
      <p>{coaching?.dailyObservation || briefing?.observation || day.summary}</p>
      {(coaching?.nextStep || briefing?.nextStep) && <div className="food-coach-next-step"><Sparkles size={17} /><p><strong>Try next</strong>{coaching?.nextStep || briefing.nextStep}</p></div>}
      {!!briefing?.evidence?.length && <details className="food-coach-evidence"><summary>What this is based on</summary><ul>{briefing.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    </article>}

    <section className="food-coach-intake" aria-label="Recorded nutrition"><div><span className="eyebrow">Recorded for {manager.selectedDate === manager.today ? "today" : shortDate(analysis.date)}</span><strong>{recorded ? Number(day.totals.calories).toLocaleString("en-IN") + " kcal" : "Nothing logged yet"}</strong><small>{day.entries} {day.entries === 1 ? "item" : "items"} · {day.meals} {day.meals === 1 ? "meal" : "meals"}</small></div>
      <dl>{[["Protein", "protein"], ["Carbs", "carbs"], ["Fat", "fat"]].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{macro(key)}{macro(key) !== "—" && <small> g</small>}</dd></div>)}</dl>
      <p>{coverage?.note || (!recorded ? "No records does not mean you have not eaten." : entries.some(entry => ["protein", "carbs", "fat"].some(key => entry[key] == null)) ? "Known nutrition only; missing values are not counted as zero." : entries.some(entry => entry.nutritionEstimated) ? "Includes estimated nutrition. Portions and recipes change the numbers." : "Recorded nutrition is not a complete measure of your needs.")}</p>
      {targetsConfigured && currentAdvice && safetyMode === "GENERAL" && <small className="food-coach-target">Your saved reference: {targets.calories.toLocaleString("en-IN")} kcal · {targets.protein} g protein. Not an instruction to skip or compensate for meals.</small>}
    </section>

    {currentAdvice && <section className="food-coach-meals"><header><div><span className="eyebrow">Options, not a prescription</span><h3>{nextMeal?.title || "For your next meal"}</h3></div><button className="food-text-button" type="button" onClick={() => ask("Suggest a practical next meal for my food log on " + manager.selectedDate + ". Use my current saved preferences and any available history. Offer a home-food option and a takeaway option, with everyday portions and labelled estimates.")}><MessageCircle size={16} />More options</button></header>
      {manager.selectedDate !== manager.today && <p className="food-coach-meal-note">Based on {shortDate(manager.selectedDate)} and your current preferences, not a record of what you ate next.</p>}
      {nextMeal?.guidance && <p className="food-coach-meal-note">{nextMeal.guidance}</p>}
      {ideas.length ? <ol className="food-coach-meal-options">{ideas.slice(0, 3).map((idea, index) => <MealOption key={idea.id || idea.name} idea={idea} index={index} date={analysis.date} onAsk={ask} />)}</ol> : <p className="food-coach-meal-note">No suitable option was prepared from the available context. Ask your coach to help with foods you have available.</p>}
      {nextMeal?.availabilityNote && <p className="food-coach-meal-note">{nextMeal.availabilityNote}</p>}
      <p className="food-coach-meal-note">These are ideas only. Nothing is added to your food log until you say you ate it.</p>
    </section>}

    <section className="food-coach-week"><header><div><span className="eyebrow">Week of {shortDate(week.start)}–{shortDate(week.end)}</span><h3>{currentAdvice && weeklyCoaching?.headline || (week.loggedDays ? "Your recorded week" : "A weekly picture will build as you log")}</h3></div><span className="food-coach-coverage">{week.loggedDays}/{week.elapsedDays} days recorded</span></header>
      <div className="weekly-food-days" aria-label="Recorded-day coverage">{(week.days || []).map(point => <div key={point.date} title={shortDate(point.date) + ": " + (point.entries ? point.entries + " items recorded" : "not recorded")}><span className={point.entries ? "is-recorded" : ""}>{point.entries ? "✓" : "—"}</span><small>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(point.date + "T12:00:00"))}</small></div>)}</div>
      <p>{week.summary}</p>
      {currentAdvice && !!weeklyCoaching?.observations?.length && <ul className="food-week-observations">{weeklyCoaching.observations.map(item => <li key={item.key || item.title}><strong>{item.title}</strong><p>{item.detail}</p>{!!item.evidence?.length && <details className="food-coach-evidence"><summary>Supporting records</summary><ul>{item.evidence.map((fact, i) => <li key={i}>{fact}</li>)}</ul></details>}</li>)}</ul>}
      {currentAdvice && (coaching?.weeklyExperiment || weeklyCoaching?.nextStep) && <div className="food-coach-next-step"><Sparkles size={17} /><p><strong>One adjustment to try</strong>{coaching?.weeklyExperiment || weeklyCoaching.nextStep}</p></div>}
      {currentAdvice && weeklyCoaching?.status === "COMPARABLE" && <small>Comparison uses {weeklyCoaching.comparableDays} equivalent weekdays; the prior period has {weeklyCoaching.previousLoggedDays} recorded days.</small>}
      <button className="food-text-button" type="button" onClick={() => ask("Review my food records for the week ending " + manager.selectedDate + ". Compare equivalent recorded periods if enough data exists, explain coverage and nutrition estimates, and suggest one practical adjustment for my current goal.")}><MessageCircle size={16} />Discuss my week<ArrowUpRight size={14} /></button>
    </section>

    {!!notices.length && currentAdvice && <details className="food-coach-care" open={safetyMode !== "GENERAL" || undefined}><summary><ShieldCheck size={16} />{safetyMode === "GENERAL" ? "Preferences & things to keep in mind" : "Guidance for your care context"}</summary><ul>{notices.map((notice, index) => <li key={index}>{notice}</li>)}</ul></details>}
    {ai && currentAdvice && <details className="food-coach-ai"><summary><Sparkles size={15} />{ai.status === "READY" ? "Your coach’s deeper review" : ai.status === "PENDING" ? "AI review in progress" : "AI review & availability"}</summary>
      {ai.assistantInterpretation && <p>{ai.assistantInterpretation}</p>}
      {!ai.assistantInterpretation && ai.guidance && <p>{ai.guidance}</p>}
      {ai.providerMessage && <p>{ai.providerMessage}</p>}
      {aiUpdatedAt && <small>AI updated {aiUpdatedAt}.</small>}
      {ai.coverage && <p>{ai.coverage}</p>}
      {!!ai.evidence?.length && <details className="food-coach-evidence"><summary>AI evidence & coverage</summary><dl>{ai.evidence.map(fact => <div key={fact.key}><dt>{fact.label}{ai.assistantEvidenceKeys?.includes(fact.key) ? " · cited by AI" : ""}</dt><dd>{fact.value}</dd></div>)}</dl></details>}
      {!!(ai.assumptions?.length || ai.safetyNotices?.length) && <ul>{[...(ai.assumptions || []), ...(ai.safetyNotices || [])].map((item, index) => <li key={index}>{item}</li>)}</ul>}
    </details>}
    <details className="food-analysis-method"><summary>How this works & sources</summary><p>A food and wellbeing coach, not a diagnosis or a substitute for your clinician. Optional context helps it adapt everyday suggestions; logging never needs a profile. Your connected AI and this app use the same analysis foundation.</p>{updatedAt && <p>Calculated {updatedAt} · {analysis.timeZone}</p>}<ul>{(analysis.assumptions || []).map((item, index) => <li key={index}>{item}</li>)}</ul><div>{(analysis.sources || []).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={13} /></a>)}</div></details>
  </section>;
}
