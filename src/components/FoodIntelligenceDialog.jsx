import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import FoodIntelligence from "./FoodIntelligence";

export default function FoodIntelligenceDialog({ open, manager, onClose }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { returnFocusRef.current = document.activeElement; dialog.showModal(); void manager.refreshAnalysis(true); }
    if (!open && dialog.open) { dialog.close(); returnFocusRef.current?.focus?.(); }
  }, [open, manager.refreshAnalysis]);
  return <dialog ref={dialogRef} className="dialog food-intelligence-dialog" aria-labelledby="food-intelligence-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-card">
      <header className="dialog-header"><div><span className="eyebrow">Useful next steps, not more numbers</span><h2 id="food-intelligence-title">Your food coach</h2><p>Everyday meal options, a short daily briefing and a useful weekly review.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close food coach"><X size={20} /></button></header>
      <div className="food-intelligence-dialog__body"><FoodIntelligence manager={manager} onNavigate={onClose} /></div>
    </div>
  </dialog>;
}
