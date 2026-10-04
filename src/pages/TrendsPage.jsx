import { CalendarCheck2, Drumstick, Flame, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";
import { shortDate } from "../lib/dates";
import { formatMacro, macroEnergy, trendSummary } from "../lib/nutrition";

function Metric({ icon: Icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`metric metric--${tone}`}>
      <span className="metric__icon"><Icon size={18} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function TrendsPage({ entries, goal, today }) {
  const trends = useMemo(() => trendSummary(entries, today, goal), [entries, goal, today]);
  const chartMax = Math.max(goal.calories, ...trends.series.map((day) => day.calories), 1);
  const energy = macroEnergy(trends.knownTotals);
  const coverageTone = trends.loggedDays >= 10 ? "positive" : trends.loggedDays >= 5 ? "warning" : "default";

  return (
    <div className="page-stack trends-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Patterns, not perfection</span>
          <h1>Nutrition trends</h1>
          <p>Your latest 14 days. Missing days stay visible instead of being counted as zero.</p>
          <p>Targets are your saved references or starter values, not personalised medical recommendations.</p>
        </div>
      </header>

      <section className="metric-grid" aria-label="Nutrition trend summary">
        <Metric icon={Flame} label="Average calories" value={trends.loggedDays ? `${trends.averageCalories.toLocaleString("en-IN")} kcal` : "—"} detail="per logged day · not full intake" />
        <Metric icon={CalendarCheck2} label="Days logged" value={`${trends.loggedDays} / 14`} detail="honest coverage" tone={coverageTone} />
        <Metric icon={Drumstick} label="Known protein average" value={trends.averageProtein == null ? "—" : `${formatMacro(trends.averageProtein)} g`} detail={`${trends.proteinKnownDays} days with protein values · partial days remain partial`} />
        <Metric icon={UtensilsCrossed} label="Food entries" value={trends.totalEntries.toLocaleString("en-IN")} detail={`${trends.overTarget} days above target`} />
      </section>

      <section className="panel calorie-trend-card">
        <header className="panel-header">
          <div><span className="eyebrow">Calories</span><h2>Last 14 days</h2></div>
          <div className="chart-legend"><span><i className="legend-bar" />Logged</span><span><i className="legend-line" />Target</span></div>
        </header>

        <div className="calorie-chart" style={{ "--target-position": `${(goal.calories / chartMax) * 100}%` }} role="img" aria-label={`${trends.loggedDays} of 14 days logged. Average ${trends.averageCalories} calories on logged days. ${trends.overTarget} days above target.`}>
          <span className="target-line"><span>{goal.calories.toLocaleString("en-IN")}</span></span>
          {trends.series.map((day) => {
            const height = day.calories ? Math.max(6, (day.calories / chartMax) * 100) : 2;
            return (
              <div className="calorie-column" key={day.date}>
                <span className="calorie-column__value">{day.calories ? compact(day.calories) : ""}</span>
                <span className={day.calories ? day.calories > goal.calories ? "calorie-bar is-over" : "calorie-bar" : "calorie-bar is-missing"} style={{ height: `${height}%` }} />
                <small>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`)).slice(0, 1)}</small>
              </div>
            );
          })}
        </div>

        <div className="coverage-note"><span className="coverage-dots">{trends.series.map((day) => <i key={day.date} className={day.calories ? "is-logged" : ""} />)}</span><span>{trends.loggedDays < 4 ? "A few more logged days will make the pattern more useful." : "Use the direction of the pattern before reacting to one day."}</span></div>

        <details className="chart-data">
          <summary>View chart data</summary>
          <table>
            <thead><tr><th>Date</th><th>Calories</th><th>Compared with target</th></tr></thead>
            <tbody>{trends.series.map((day) => <tr key={day.date}><td>{shortDate(day.date)}</td><td>{day.calories ? `${day.calories.toLocaleString("en-IN")} kcal` : "Not logged"}</td><td>{!day.calories ? "Missing" : day.calories > goal.calories ? "Above" : "At or below"}</td></tr>)}</tbody>
          </table>
        </details>
      </section>

      <section className="trend-details">
        <article className="panel macro-split-card">
          <header className="panel-header"><div><span className="eyebrow">Known recorded values</span><h2>Macro energy split</h2></div></header>
          {energy.total && !trends.partialNutrition ? (
            <>
              <div className="macro-split" aria-label={`Estimated energy split: ${energy.proteinShare}% protein, ${energy.carbsShare}% carbohydrates, ${energy.fatShare}% fat`}>
                <span className="split-protein" style={{ width: `${energy.proteinShare}%` }} />
                <span className="split-carbs" style={{ width: `${energy.carbsShare}%` }} />
                <span className="split-fat" style={{ width: `${energy.fatShare}%` }} />
              </div>
              <div className="split-list">
                <SplitRow label="Protein" grams={trends.knownTotals.protein} share={energy.proteinShare} tone="protein" />
                <SplitRow label="Carbs" grams={trends.knownTotals.carbs} share={energy.carbsShare} tone="carbs" />
                <SplitRow label="Fat" grams={trends.knownTotals.fat} share={energy.fatShare} tone="fat" />
              </div>
              <p className="method-note">Whole-period recorded totals, not daily requirements. Energy shares estimate 4 kcal/g for protein and carbohydrates and 9 kcal/g for fat. {trends.estimatedEntries > 0 && `${trends.estimatedEntries} entries use nutrition estimates.`}</p>
            </>
          ) : <div className="panel-empty"><strong>{trends.partialNutrition ? "Some macros are unknown" : "No macro pattern yet"}</strong><span>{trends.partialNutrition ? "A complete split would be misleading. Known averages above remain available; unknown nutrients are not zero." : "Your recorded foods remain available without macro values."}</span></div>}
        </article>

        <article className="panel frequent-card">
          <header className="panel-header"><div><span className="eyebrow">Your staples</span><h2>Most logged foods</h2></div></header>
          {trends.frequentFoods.length ? (
            <ol className="frequent-list">
              {trends.frequentFoods.map((food, index) => (
                <li key={food.name.toLocaleLowerCase()}><span>{index + 1}</span><strong>{food.name}</strong><small>{food.count}× logged</small><em>{Math.round(food.calories / food.count)} kcal avg</em></li>
              ))}
            </ol>
          ) : <div className="panel-empty"><strong>No food patterns yet</strong><span>Log a few meals and your frequent foods will appear here.</span></div>}
        </article>
      </section>
    </div>
  );
}

function SplitRow({ label, grams, share, tone }) {
  return <div><span><i className={`split-dot split-dot--${tone}`} />{label}</span><strong>{formatMacro(grams)} g</strong><small>{share}%</small></div>;
}

function compact(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1).replace(".0", "")}k` : String(value);
}
