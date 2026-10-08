import { Camera, Clock3, Plus, Salad } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import FoodRow from "../components/FoodRow";
import FoodDayOverview from "../components/FoodDayOverview";
import QuickFoodLog from "../components/QuickFoodLog";
import { chronologicalFoods, eatingTimeLabel } from "../lib/foodTimeline";
import { fullDate } from "../lib/dates";
import { entriesOn, nutritionTotal } from "../lib/nutrition";

function useCompactJournal() {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 40rem)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 40rem)");
    const update = () => setCompact(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return compact;
}

export default function DailyLogPage({ manager, deletingId, deleteError, quickSaving, waterSaving, onAdd, onQuickSave, onEdit, onDelete, onWaterChange }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const compact = useCompactJournal();
  const dayEntries = useMemo(() => chronologicalFoods(entriesOn(manager.entries, manager.selectedDate)), [manager.entries, manager.selectedDate]);
  const totals = useMemo(() => nutritionTotal(dayEntries), [dayEntries]);
  const estimatedNutrition = dayEntries.some(entry => entry.nutritionEstimated || Object.values(entry.nutrients || {}).some(value => value.estimated !== false));
  const overview = <FoodDayOverview manager={manager} entries={dayEntries} totals={totals} waterSaving={waterSaving} onWaterChange={onWaterChange} onEdit={onEdit} />;
  async function confirmDelete() {
    if (pendingDelete && await onDelete(pendingDelete.id)) setPendingDelete(null);
  }
  return <div className="food-log-workspace">
    <header className="food-log-heading"><div><span className="food-journal-date">{fullDate(manager.selectedDate, manager.selectedDate !== manager.today)}</span><h1>{manager.selectedDate === manager.today ? "Your day, in food." : "Your food journal"}</h1><p>One simple log. A clearer picture of how you eat.</p></div><span className="food-journal-count">{dayEntries.length} {dayEntries.length === 1 ? "food" : "foods"} recorded</span><a className="food-mobile-nutrition" href="#food-day-overview">Nutrition ↓</a></header>
    <QuickFoodLog entries={manager.entries} date={manager.selectedDate} today={manager.today} timeZone={manager.timeZone} busy={quickSaving || manager.loading} onSave={onQuickSave} onRefresh={manager.retry} onPhoto={() => onAdd()} />
    {!compact && overview}
    <section className="food-timeline" aria-labelledby="food-ledger-title">
      <header className="food-timeline__header"><div><h2 id="food-ledger-title">What you had</h2><p><Clock3 size={13} />{manager.timeZone} · Select a food to edit</p></div>{dayEntries.length > 0 && <span className="food-energy-total">{totals.calories.toLocaleString("en-IN")}<small>kcal recorded</small></span>}</header>
      {dayEntries.length ? <ol className="food-timeline__list">{dayEntries.map(food => <li key={food.id} className={!food.eatenTime ? "food-timeline__item is-untimed" : "food-timeline__item"}>
        <div className="food-timeline__time">{food.eatenTime ? <time dateTime={food.eatenTime}>{eatingTimeLabel(food.eatenTime)}</time> : <span>Time not recorded</span>}{food.eatenTime && food.timeSource === "LOGGED_NOW" && <small>Logging time</small>}{food.eatenTime && food.timeSource === "ESTIMATED" && <small>Estimated time</small>}<span className="food-timeline__dot" aria-hidden="true" /></div>
        <FoodRow entry={food} onEdit={onEdit} onDelete={setPendingDelete} />
      </li>)}</ol> : <div className="food-journal-empty"><span className="food-journal-empty__icon"><Salad size={27} /></span><h3>Your first food starts the story</h3><p>Type what you ate above, or add a photo. Time and nutrition are handled for you.</p><button className="button button--secondary" type="button" onClick={() => onAdd()}><Camera size={17} />Add a food photo</button></div>}
      {dayEntries.length > 0 && <footer className="food-timeline__footer"><span>{estimatedNutrition ? "Includes estimates · editable any time" : "Recorded foods only · your day may still be incomplete"}</span><button className="food-text-button" type="button" onClick={() => onAdd()}><Plus size={16} />Add food</button></footer>}
    </section>
    {compact && overview}
    <ConfirmDialog error={deleteError && deleteError.id === pendingDelete?.id ? deleteError.message : ""} open={Boolean(pendingDelete)} entry={pendingDelete} busy={deletingId === pendingDelete?.id} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
  </div>;
}
