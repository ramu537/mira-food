import { Droplets, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import FoodRow from "../components/FoodRow";
import MealIcon from "../components/MealIcon";
import QuickFoodLog from "../components/QuickFoodLog";
import { groupedMeals } from "../lib/dailyFood";
import { fullDate } from "../lib/dates";
import { entriesOn, formatMacro, nutritionTotal } from "../lib/nutrition";

export default function DailyLogPage({ manager, deletingId, quickSaving, waterSaving, onAdd, onQuickSave, onEdit, onDelete, onWaterChange }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const dayEntries = useMemo(() => entriesOn(manager.entries, manager.selectedDate), [manager.entries, manager.selectedDate]);
  const totals = useMemo(() => nutritionTotal(dayEntries), [dayEntries]);
  const meals = useMemo(() => groupedMeals(dayEntries), [dayEntries]);
  const mealsLogged = meals.filter((meal) => meal.entries.length).length;
  async function confirmDelete() {
    if (pendingDelete && await onDelete(pendingDelete.id)) setPendingDelete(null);
  }
  return <div className="food-log-workspace">
    <header className="food-log-heading"><div><h1>{manager.selectedDate === manager.today ? "Today’s food" : "Food log"}</h1><p>{fullDate(manager.selectedDate, manager.selectedDate !== manager.today)} · {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"} across {mealsLogged} {mealsLogged === 1 ? "meal" : "meals"}</p></div></header>

    <QuickFoodLog entries={manager.entries} date={manager.selectedDate} busy={quickSaving || manager.loading} onSave={onQuickSave} />

    <section className="food-day-summary" aria-label="Recorded daily totals">
      <div><span>Logged</span><strong>{totals.calories.toLocaleString("en-IN")} <small>kcal</small></strong></div>
      <div><span>Protein</span><strong>{formatMacro(totals.protein)} <small>g</small></strong></div>
      <div><span>Carbs</span><strong>{formatMacro(totals.carbs)} <small>g</small></strong></div>
      <div><span>Fat</span><strong>{formatMacro(totals.fat)} <small>g</small></strong></div>
      <div className="water-stepper"><span>Water</span><span><button type="button" disabled={waterSaving || manager.water <= 0} onClick={() => onWaterChange(Math.max(0, manager.water - 1))} aria-label="Remove one glass of water"><Minus size={15} /></button><strong><Droplets size={15} />{manager.water}<small>/{manager.goal.waterGlasses}</small></strong><button type="button" disabled={waterSaving || manager.water >= manager.goal.waterGlasses} onClick={() => onWaterChange(manager.water + 1)} aria-label="Add one glass of water"><Plus size={15} /></button></span></div>
    </section>

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
    <ConfirmDialog open={Boolean(pendingDelete)} entry={pendingDelete} busy={deletingId === pendingDelete?.id} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
  </div>;
}
