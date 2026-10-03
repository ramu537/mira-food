import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, MessageCircle, Minimize2, Minus, X } from "lucide-react";
import CoachingWorkspace from "./CoachingWorkspace";

const labels = { expenses: "Money", food: "Food", habits: "Habits", tasks: "Tasks", notes: "Notes", diary: "Diary", experiences: "Experiences", investments: "Investments" };
export default function FloatingAssistant({ domain, userId, date }) {
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false), [visited, setVisited] = useState([]);
  const [viewport, setViewport] = useState(null);
  const launcher = useRef(null), panel = useRef(null);
  const id = useId();
  useEffect(() => { if (open) setVisited(current => current.includes(domain) ? current : [...current, domain]); }, [open, domain]);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const view = window.visualViewport;
    const sync = () => setViewport({ height: view.height, bottom: Math.max(0, window.innerHeight - view.height - view.offsetTop) });
    sync(); view.addEventListener("resize", sync); view.addEventListener("scroll", sync);
    return () => { view.removeEventListener("resize", sync); view.removeEventListener("scroll", sync); setViewport(null); };
  }, [open]);
  function close() { setOpen(false); launcher.current?.focus({ preventScroll: true }); }
  return createPortal(<div className="assistant-root" style={viewport ? { "--assistant-viewport-height": viewport.height + "px", "--assistant-viewport-bottom": viewport.bottom + "px" } : undefined}>
    <button ref={launcher} className="assistant-launcher" type="button" aria-label={open ? "Minimize Mira assistant" : "Chat with Mira assistant"} aria-expanded={open} aria-controls={id} title={open ? "Minimize assistant" : "Ask Mira"} onClick={() => open ? close() : setOpen(true)}>
      {open ? <Minus size={23} /> : <MessageCircle size={24} />}<span className="assistant-launcher__label">Ask Mira</span>
    </button>
    <section ref={panel} id={id} hidden={!open} tabIndex={-1} className={"assistant-window" + (expanded ? " is-expanded" : "")} role="dialog" aria-labelledby={id + "-title"}
      onKeyDown={event => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <header className="assistant-window__header"><span className="assistant-window__mark"><MessageCircle size={19} /></span><div><h2 id={id + "-title"}>Mira assistant</h2><p>{labels[domain]} · {date || "Your records"}</p></div>
        <div className="assistant-window__actions"><button className="coach-icon assistant-expand" type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Restore compact chat" : "Expand chat"} title={expanded ? "Restore size" : "Expand"}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button className="coach-icon" type="button" onClick={close} aria-label="Minimize chat" title="Minimize"><Minus size={18} /></button><button className="coach-icon" type="button" onClick={close} aria-label="Close chat window" title="Close"><X size={18} /></button></div>
      </header>
      {visited.map(product => <div key={product + ":" + userId} className="assistant-window__workspace" hidden={product !== domain}><CoachingWorkspace domain={product} date={date} active={open && product === domain} onNavigate={close} /></div>)}
    </section>
  </div>, document.body);
}
