import { useEffect, useId, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { readThemePreference, saveThemePreference } from "../lib/theme";
const choices = [{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }];
export default function ThemeControl() {
  const [preference, setPreference] = useState(readThemePreference);
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const id = useId();
  const Icon = choices.find(choice => choice.value === preference)?.icon || Monitor;
  useEffect(() => {
    const sync = () => setPreference(document.documentElement.dataset.themePreference || readThemePreference());
    window.addEventListener("mira-theme-change", sync);
    return () => window.removeEventListener("mira-theme-change", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className="theme-control" onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="icon-button theme-control__trigger" type="button" aria-label={"Appearance: " + preference} title="Appearance" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Icon size={18} /></button>
    {open && <div id={id} className="theme-control__panel" role="group" aria-label="Choose appearance"><strong>Appearance</strong><p>Make this space yours.</p>
      {choices.map(({ value, label, icon: ChoiceIcon }) => <button type="button" key={value} aria-pressed={preference === value} onClick={() => {
        saveThemePreference(value); setPreference(value); setOpen(false); trigger.current?.focus();
      }}><ChoiceIcon size={16} /><span>{label}</span>{preference === value && <Check size={15} />}</button>)}
    </div>}
  </div>;
}
