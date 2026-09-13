import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [onClose, toast]);

  if (!toast) return null;
  const Icon = toast.tone === "error" ? XCircle : CheckCircle2;
  return (
    <div className={`toast toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
      <Icon size={19} />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message"><X size={17} /></button>
    </div>
  );
}

