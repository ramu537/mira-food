import { ArrowUpRight, Check, ChevronDown, Droplets, Leaf, Minus, Plus, Sprout } from "lucide-react";
import { useId, useState } from "react";
import { nutrientDefinitions, nutrientNumber } from "../lib/foodTimeline";
import { askFoodCoach } from "../lib/foodCoach";

export default function FoodDayOverview({ manager, entries, totals, waterSaving, onWaterChange, onEdit }) {
  const [detail, setDetail] = useState(null);
  const id = useId();
  const metrics = !manager.analysisStale && manager.analysis?.date === manager.selectedDate ? manager.analysis.dailyMetrics : null;
  const balance = metrics?.balance;
  const knownProtein = entries.filter(food => food.protein != null).length;
  const nutrients = metrics?.nutrients || nutrientDefinitions.map(([key, label, unit]) => {
    const known = entries.filter(food => food.nutrients?.[key]?.amount != null);
    return { key, label, unit, amount: known.length ? known.reduce((sum, food) => sum + Number(food.nutrients[key].amount), 0) : null,
      knownEntries: known.length, estimatedEntries: known.filter(food => food.nutrients[key].estimated !== false).length,
      contributors: known.map(food => ({ id: food.id, name: food.name, amount: food.nutrients[key].amount, estimated: food.nutrients[key].estimated !== false })) };
  });
  const micronutrients = nutrients.filter(n => n.key !== "fiber" && n.key !== "sodium");
  const knownMicros = micronutrients.filter(n => n.amount != null).length;
  const fiber = nutrients.find(n => n.key === "fiber");
  function toggle(next) { setDetail(current => current === next ? null : next); }
  function openFood(id) { const entry = entries.find(food => food.id === id); if (entry) onEdit(entry); }
  const waterGoal = metrics?.waterGoalGlasses || manager.goal.waterGlasses;
  return <section className="day-overview" id="food-day-overview" aria-label="Your recorded nutrition" tabIndex={-1}>
    <div className="day-overview__cards">
      <button className="nutrition-card nutrition-card--balance" type="button" onClick={() => toggle("balance")} aria-expanded={detail === "balance"} aria-controls={id}>
        <span className="nutrition-card__label"><Leaf size={17} />Food balance<ArrowUpRight size={14} /></span>
        <strong>{balance?.score == null ? "—" : balance.score}<small>{balance?.score == null ? "" : "/100"}</small></strong>
        <span className="nutrition-card__note">{balance?.score != null ? "Variety indicator · provisional" : manager.analysisLoading ? "Updating your food picture…" : manager.analysisError ? "Analysis unavailable · retry below" : entries.length ? "No food-group detail recorded yet" : "Starts with your first food"}</span>
      </button>
      <button className="nutrition-card" type="button" onClick={() => toggle("protein")} aria-expanded={detail === "protein"} aria-controls={id}>
        <span className="nutrition-card__label"><Sprout size={17} />Protein<ArrowUpRight size={14} /></span>
        <strong>{knownProtein ? nutrientNumber(totals.protein) : "—"}<small>g</small></strong>
        {metrics?.proteinGoalGrams > 0 && <progress value={metrics.proteinProgressPercent || 0} max={100} aria-label="Recorded protein against your saved target" />}
        <span className="nutrition-card__note">{metrics?.proteinGoalGrams > 0 ? `of your ${metrics.proteinGoalGrams} g reference` : knownProtein ? `${knownProtein}/${entries.length} foods with protein data` : "Known values appear as you log"}</span>
      </button>
      <div className="nutrition-card nutrition-card--water">
        <span className="nutrition-card__label"><Droplets size={17} />Water<span className="nutrition-card__goal">{waterGoal} glass goal</span></span>
        <div className="water-control"><strong>{manager.water}<small>glasses</small></strong><span>
          <button type="button" aria-label="Remove one logged glass of water" disabled={waterSaving || manager.water <= 0} onClick={() => onWaterChange(Math.max(0, manager.water - 1))}><Minus size={17} /></button>
          <button type="button" aria-label="Log one glass of water" disabled={waterSaving || manager.water >= 30} onClick={() => onWaterChange(manager.water + 1)}><Plus size={17} /></button>
        </span></div>
        <progress value={Math.min(manager.water, waterGoal)} max={Math.max(1, waterGoal)} aria-label="Water logging progress" />
        <span className="nutrition-card__note">{waterSaving ? "Saving water…" : `${Math.min(100, Math.round(manager.water / Math.max(1, waterGoal) * 100))}% of ${metrics?.waterGoalConfigured ? "your" : "starter"} logging goal`}</span>
      </div>
      <button className="nutrition-card" type="button" onClick={() => toggle("nutrients")} aria-expanded={detail === "nutrients"} aria-controls={id}>
        <span className="nutrition-card__label"><span className="nutrient-symbol" aria-hidden="true">Aa</span>Nutrients<ArrowUpRight size={14} /></span>
        <strong>{knownMicros || "—"}<small>{knownMicros ? "/8 known" : ""}</small></strong>
        <span className="nutrition-card__note">{fiber?.amount != null ? `${nutrientNumber(fiber.amount)} g fibre · vitamins & minerals` : "Fibre, vitamins & minerals"}</span>
      </button>
    </div>
    {manager.analysisError && <div className="nutrition-refresh-note" role="status"><span>Nutrition analysis could not refresh. Your food records and known nutrient amounts remain available.</span><button className="food-text-button" type="button" onClick={() => manager.refreshAnalysis()} disabled={manager.analysisLoading}>Retry analysis</button></div>}
    {detail && <div className="nutrition-detail" id={id}>
      <header><h3>{detail === "balance" ? "What this score means" : detail === "protein" ? "Your recorded protein" : "Nutrition, with the detail behind it"}</h3><button className="food-text-button" type="button" onClick={() => setDetail(null)}><ChevronDown size={16} />Close details</button></header>
      {detail === "balance" ? <>
        <p>{balance?.explanation || "No food-group score is available yet. Log a description or photo; no questionnaire or category selection is needed."}</p>
        {!!balance?.groups?.length && <div className="food-group-pills">{balance.groups.map(group => <span key={group.key} className={group.entryIds.length ? "is-present" : ""}>{group.entryIds.length ? <Check size={14} /> : <span aria-hidden="true">·</span>}{group.label}</span>)}</div>}
        {balance?.nextStep && <p>{balance.nextStep}</p>}
        <small>{balance?.method?.replace(/^VARIETY_V1: /, "Method: ") || "This indicator reflects approximate food-group variety, not medical health or complete nutrient intake."}</small>
      </> : detail === "protein" ? <>
        <p>{knownProtein ? `${nutrientNumber(totals.protein)} g from ${knownProtein} of ${entries.length} recorded foods. Missing values and unlogged meals are unknown.` : "There are no recorded protein values yet. This does not mean you ate no protein."}</p>
        <div className="nutrient-contributors">{entries.filter(food => food.protein != null).map(food => <button type="button" key={food.id} onClick={() => onEdit(food)}><span>{food.name}{food.nutritionEstimated && <small>Estimated</small>}</span><strong>{nutrientNumber(food.protein)} g</strong></button>)}</div>
        <small>Targets are optional references, not prescriptions. No extra meal is required just to reach a number.</small>
      </> : <>
        <p>Whole-portion totals from recorded foods. Unknown values are not zero; estimates depend on ingredients, preparation and portions.</p>
        <div className="nutrient-grid">{nutrients.map(nutrient => <details className="nutrient-item" key={nutrient.key}>
          <summary><span>{nutrient.label}<small>{nutrient.amount == null ? "Not recorded" : `${nutrient.knownEntries}/${entries.length} foods · ${nutrient.estimatedEntries ? "includes estimates" : "supplied values"}`}</small></span><strong>{nutrientNumber(nutrient.amount)}<small>{nutrient.unit}</small></strong></summary>
          <div className="nutrient-contributors">{nutrient.contributors.length ? nutrient.contributors.map(food => <button type="button" key={food.id} onClick={() => openFood(food.id)}><span>{food.name}{food.estimated && <small>Estimated</small>}</span><strong>{nutrientNumber(food.amount)} {nutrient.unit}</strong></button>) : <p>No amount available. Your next AI capture can add reasonable labelled estimates; optional editing is available on each food.</p>}</div>
          {nutrient.knownEntries > nutrient.contributors.length && <small>Largest {nutrient.contributors.length} sources shown. The total includes all {nutrient.knownEntries} foods with values.</small>}
        </details>)}</div>
      </>}
      <button className="food-text-button" type="button" onClick={() => askFoodCoach(`Help me understand ${detail === "balance" ? "food balance and variety" : detail === "protein" ? "my protein intake" : "my recorded fibre, vitamins and minerals"} for ${manager.selectedDate}. Explain known values, estimates and coverage, then suggest one practical next step using my saved preferences. Do not infer deficiencies or treat the variety indicator as a medical score.`, manager.selectedDate)}>Discuss with my coach<ArrowUpRight size={15} /></button>
    </div>}
  </section>;
}
