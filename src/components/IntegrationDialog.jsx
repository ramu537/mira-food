import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Native modality provides keyboard containment without hand-built focus traps. */
export default function IntegrationDialog({ open, title, description, icon: Icon, busy = false, onClose, children, wide = false }) {
  const dialog = useRef(null), returnFocus = useRef(null);
  const id = useId();
  useEffect(() => {
    const node = dialog.current;
    if (open && !node.open) { returnFocus.current = document.activeElement; node.showModal(); }
    if (!open && node.open) { node.close(); returnFocus.current?.focus?.({ preventScroll: true }); }
  }, [open]);
  return createPortal(<dialog ref={dialog} className={"integration-dialog" + (wide ? " integration-dialog--wide" : "")} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (!busy && event.target === dialog.current) onClose(); }}>
    <div className="dialog-card integration-card">
      <header className="integration-header"><span className="integration-mark">{Icon && <Icon size={21} />}</span><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header>
      {children}
    </div>
  </dialog>, document.body);
}
