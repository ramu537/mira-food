import { Droplets, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import FoodIntelligence from "../components/FoodIntelligence";
import ConfirmDialog from "../components/ConfirmDialog";
import FoodRow from "../components/FoodRow";
import MealIcon from "../components/MealIcon";
import { fullDate } from "../lib/dates";
import { entriesOn, formatMacro, mealTypes, nutritionTotal, percentage } from "../lib/nutrition";

function MacroProgress({ label, value, goal, tone }) {
  const used = percentage(value, goal, 140);
  return (
    <div className={`macro-progress macro-progress--${tone}`}>
      <div><span>{label}</span><strong>{formatMacro(value)} <small>/ {goal} g</small></strong></div>
      <div className="macro-track" aria-label={`${label}: ${used}% of goal`}><span style={{ width: `${Math.min(used, 100)}%` }} /></div>
    </div>
  );
}

export default function DailyLogPage({ manager, deletingId, waterSaving, onAdd, onEdit, onDelete, onEditGoal, onWaterChange }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const dayEntries = useMemo(() => entriesOn(manager.entries, manager.selectedDate), [manager.entries, manager.selectedDate]);
  const totals = useMemo(() => nutritionTotal(dayEntries), [dayEntries]);
  const mealsLogged = new Set(dayEntries.map((entry) => entry.meal)).size;

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (await onDelete(pendingDelete.id)) setPendingDelete(null);
  }

  return (
    <div className="page-stack food-daily-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Your daily food companion</span>
          <h1>{manager.selectedDate === manager.today ? "Today’s food" : "Food log"}</h1>
          <p>{fullDate(manager.selectedDate, manager.selectedDate !== manager.today)} · {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"} across {mealsLogged} {mealsLogged === 1 ? "meal" : "meals"}</p>
        </div>
        <Link className="button button--secondary" to="/settings"><Pencil size={16} /> Goals & preferences</Link>
      </header>

      <FoodIntelligence manager={manager} />

      <details className="food-target-details"><summary>Numeric references & water <span>{manager.water} glasses recorded</span></summary>
      <p>These are saved references or app starter values, not prescribed needs. Medical fluid and nutrition instructions take priority.</p>
      <button className="food-text-button" type="button" onClick={onEditGoal}><Pencil size={15} />Edit numeric targets</button>
      <section className="daily-overview">
        <article className="panel macro-card">
          <header className="panel-header"><div><span className="eyebrow">Daily balance</span><h2>Macros</h2></div></header>
          <div className="macro-list">
            <MacroProgress label="Protein" value={totals.protein} goal={manager.goal.protein} tone="protein" />
            <MacroProgress label="Carbs" value={totals.carbs} goal={manager.goal.carbs} tone="carbs" />
            <MacroProgress label="Fat" value={totals.fat} goal={manager.goal.fat} tone="fat" />
          </div>
        </article>
        <article className="panel water-card">
          <header className="panel-header"><div><span className="eyebrow">Hydration</span><h2>Water</h2></div><strong>{manager.water} / {manager.goal.waterGlasses}</strong></header>
          <div className="water-grid" role="group" aria-label="Water intake" aria-busy={waterSaving}>
            {Array.from({ length: manager.goal.waterGlasses }, (_, index) => {
              const amount = index + 1;
              const filled = amount <= manager.water;
              const nextAmount = filled && amount === manager.water ? amount - 1 : amount;
              return (
                <button key={amount} className={filled ? "is-filled" : ""} type="button" disabled={waterSaving} aria-label={`Set water to ${nextAmount} glasses`} aria-pressed={filled} onClick={() => onWaterChange(nextAmount)}>
                  <Droplets size={17} />
                </button>
              );
            })}
          </div>
          <p>Tap the current glass again to subtract one.</p>
        </article>
      </section>
      </details>

      <section className="meal-grid" aria-label="Meals">
        {mealTypes.map((meal) => {
          const mealEntries = dayEntries.filter((entry) => entry.meal === meal.value);
          const calories = mealEntries.reduce((sum, entry) => sum + Number(entry.calories), 0);
          return (
            <article className="meal-card" key={meal.value} style={{ "--meal-color": meal.color }}>
              <header>
                <div className="meal-card__title"><MealIcon meal={meal.value} /><span><strong>{meal.label}</strong><small>{meal.hint}</small></span></div>
                <span className="meal-card__total">{calories.toLocaleString("en-IN")} kcal</span>
                <button className="button button--quiet" type="button" onClick={() => onAdd(meal.value)}><Plus size={16} /> Add</button>
              </header>
              {mealEntries.length ? (
                <div className="food-list">{mealEntries.map((entry) => <FoodRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={setPendingDelete} />)}</div>
              ) : (
                <button className="empty-meal" type="button" onClick={() => onAdd(meal.value)}><span>Nothing logged</span><strong>Add to {meal.label.toLowerCase()}</strong></button>
              )}
            </article>
          );
        })}
      </section>

      <ConfirmDialog open={Boolean(pendingDelete)} entry={pendingDelete} busy={deletingId === pendingDelete?.id} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
}
