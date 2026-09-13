import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMacro } from "../lib/nutrition";

export default function FoodRow({ entry, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        <small>P {formatMacro(entry.protein)} · C {formatMacro(entry.carbs)} · F {formatMacro(entry.fat)}</small>
      </button>
      <strong className="food-row__calories">{Number(entry.calories).toLocaleString("en-IN")} <small>kcal</small></strong>
      <div className="row-menu" ref={ref}>
        <button className="icon-button" type="button" aria-label={`Actions for ${entry.name}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          <MoreHorizontal size={19} />
        </button>
        {open && (
          <div className="row-menu__popover">
            <button type="button" onClick={() => { setOpen(false); onEdit(entry); }}><Pencil size={16} /> Edit</button>
            <button className="danger-action" type="button" onClick={() => { setOpen(false); onDelete(entry); }}><Trash2 size={16} /> Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

