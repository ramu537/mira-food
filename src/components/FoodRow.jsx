import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMacro } from "../lib/nutrition";

export default function FoodRow({ entry, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null), trigger = useRef(null);
  const macrosKnown = [entry.protein, entry.carbs, entry.fat].some((value) => value != null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="food-row">
      <button className="food-row__main" type="button" onClick={() => onEdit(entry)}>
        <strong>{entry.name}</strong>
        {entry.source && entry.source !== "UNSPECIFIED" && <small className="food-row__estimate">{({ MCP: "Logged by your assistant", AI_CAPTURE: "AI capture", MANUAL: "Manually logged" })[entry.source] || entry.source}</small>}
        {entry.nutritionEstimated && <small className="food-row__estimate" title={entry.estimationNote || "Estimated nutrition or portion; tap to edit"}>Estimated · tap to edit</small>}
        <small>{macrosKnown ? `P ${formatMacro(entry.protein)} · C ${formatMacro(entry.carbs)} · F ${formatMacro(entry.fat)}` : "Macros not added"}</small>
      </button>
      <strong className="food-row__calories">{Number(entry.calories).toLocaleString("en-IN")} <small>kcal</small></strong>
      <div className="row-menu" ref={ref} onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
        <button ref={trigger} className="icon-button" type="button" aria-label={`Actions for ${entry.name}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          <MoreHorizontal size={19} />
        </button>
        {open && (
          <div className="row-menu__popover">
            <button type="button" onClick={() => { trigger.current?.focus(); setOpen(false); onEdit(entry); }}><Pencil size={16} /> Edit</button>
            <button className="danger-action" type="button" onClick={() => { trigger.current?.focus(); setOpen(false); onDelete(entry); }}><Trash2 size={16} /> Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
