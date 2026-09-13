import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, entry, busy, onCancel, onConfirm }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog confirm-dialog"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
      onClick={(event) => { if (event.target === ref.current && !busy) onCancel(); }}
    >
      <div className="dialog-card">
        <button className="icon-button dialog-close" type="button" onClick={onCancel} disabled={busy} aria-label="Close">
          <X size={19} />
        </button>
        <span className="confirm-icon"><AlertTriangle size={22} /></span>
        <h2>Delete this food entry?</h2>
        <p><strong>{entry?.name}</strong> will be removed from this day’s nutrition totals.</p>
        <div className="dialog-actions">
          <button className="button button--ghost" type="button" onClick={onCancel} disabled={busy}>Keep it</button>
          <button className="button button--danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : "Delete entry"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

