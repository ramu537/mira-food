import { Droplets, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import FoodRow from "../components/FoodRow";
import MealIcon from "../components/MealIcon";
import QuickFoodLog from "../components/QuickFoodLog";
import { groupedMeals } from "../lib/dailyFood";
import { fullDate } from "../lib/dates";
import { entriesOn, formatMacro, nutritionTotal } from "../lib/nutrition";

export default function DailyLogPage({ manager, deletingId, deleteError, quickSaving, waterSaving, onAdd, onQuickSave, onEdit, onDelete, onWaterChange }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const dayEntries = useMemo(() => entriesOn(manager.entries, manager.selectedDate), [manager.entries, manager.selectedDate]);
  const totals = useMemo(() => nutritionTotal(dayEntries), [dayEntries]);
  const meals = useMemo(() => groupedMeals(dayEntries), [dayEntries]);
  const mealsLogged = meals.filter((meal) => meal.entries.length).length;
  const macroTotal = key => dayEntries.some(entry => entry[key] != null) ? formatMacro(totals[key]) : "—";
  const partialNutrition = dayEntries.some(entry => ["protein", "carbs", "fat"].some(key => entry[key] == null));
  const estimatedNutrition = dayEntries.some(entry => entry.nutritionEstimated);
  async function confirmDelete() {
    if (pendingDelete && await onDelete(pendingDelete.id)) setPendingDelete(null);
  }
  return <div className="food-log-workspace">
    <header className="food-log-heading"><div><h1>{manager.selectedDate === manager.today ? "Today’s food" : "Food log"}</h1><p>{fullDate(manager.selectedDate, manager.selectedDate !== manager.today)} · {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"} across {mealsLogged} {mealsLogged === 1 ? "meal" : "meals"}</p></div></header>

    <QuickFoodLog entries={manager.entries} date={manager.selectedDate} busy={quickSaving || manager.loading} onSave={onQuickSave} onRefresh={manager.retry} />

    <section className="food-day-summary" aria-label="Recorded daily totals">
      <div><span>Logged</span><strong>{totals.calories.toLocaleString("en-IN")} <small>kcal</small></strong></div>
      <div><span>Protein</span><strong>{macroTotal("protein")} <small>g</small></strong></div>
      <div><span>Carbs</span><strong>{macroTotal("carbs")} <small>g</small></strong></div>
      <div><span>Fat</span><strong>{macroTotal("fat")} <small>g</small></strong></div>
      <div className="water-stepper"><span>Water</span><span><button type="button" disabled={waterSaving || manager.water <= 0} onClick={() => onWaterChange(Math.max(0, manager.water - 1))} aria-label="Remove one glass of water"><Minus size={15} /></button><strong><Droplets size={15} />{manager.water}<small>/{manager.goal.waterGlasses}</small></strong><button type="button" disabled={waterSaving || manager.water >= 30} onClick={() => onWaterChange(manager.water + 1)} aria-label="Add one glass of water"><Plus size={15} /></button></span></div>
    </section>

    {(partialNutrition || estimatedNutrition) && <p className="food-nutrition-coverage">{partialNutrition ? "Some macros are unknown; totals include only recorded values. " : ""}{estimatedNutrition ? "Nutrition includes estimates. Select a food to review or correct it." : ""}</p>}
    <section className="food-ledger" aria-labelledby="food-ledger-title">
      <header><div><h2 id="food-ledger-title">What you had</h2><p>Select an item to edit it. Blank meals are simply unrecorded.</p></div></header>
      <div className="food-ledger__groups">{meals.map((meal) => {
        const calories = meal.entries.reduce((sum, entry) => sum + Number(entry.calories), 0);
        return <article className="food-ledger-group" key={meal.value} style={{ "--meal-color": meal.color }}>
          <header><div><MealIcon meal={meal.value} size="small" /><span><strong>{meal.label}</strong><small>{meal.entries.length ? meal.entries.length + " " + (meal.entries.length === 1 ? "item" : "items") + " · " + calories.toLocaleString("en-IN") + " kcal" : "Nothing recorded"}</small></span></div><button className="icon-button" type="button" onClick={() => onAdd(meal.value)} aria-label={"Add food to " + meal.label} title={"Add to " + meal.label}><Plus size={18} /></button></header>
          {meal.entries.length ? <div className="food-list">{meal.entries.map((entry) => <FoodRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={setPendingDelete} />)}</div>
            : <button className="food-ledger-empty" type="button" onClick={() => onAdd(meal.value)}>Add {meal.label.toLowerCase()}</button>}
        </article>;
      })}</div>
    </section>
    <ConfirmDialog error={deleteError && deleteError.id === pendingDelete?.id ? deleteError.message : ""} open={Boolean(pendingDelete)} entry={pendingDelete} busy={deletingId === pendingDelete?.id} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
  </div>;
}
