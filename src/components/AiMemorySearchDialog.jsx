import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Database, LoaderCircle, Search, X } from "lucide-react";
import { memoryApi } from "../api/memory";
import IntegrationDialog from "./IntegrationDialog";

const domains = [{ id: "ALL", label: "All spaces" }, { id: "EXPENSE", label: "Expenses" }, { id: "FOOD", label: "Food" }, { id: "HABIT", label: "Habits" }, { id: "TASK", label: "Tasks" }, { id: "NOTE", label: "Notes" }, { id: "DIARY", label: "Diary" }, { id: "INVESTMENT", label: "Investments" }];
const currentDomain = "FOOD";
function sourceId(result) {
  const value = String(result.sourceId ?? result.entityId ?? "");
  return /^[1-9]\d*$/.test(value) ? value : null;
}
function sourceDate(result) {
  const value = String(result.entityDate || result.metadata?.entryDate || result.metadata?.spentOn || result.metadata?.loggedOn || result.metadata?.dueOn || result.metadata?.valuedOn || result.occurredAt?.slice(0, 10) || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
export default function AiMemorySearchDialog({ open, onClose, onSelectDate, onSelectNote }) {
  const [query, setQuery] = useState(""), [selectedDomain, setSelectedDomain] = useState(currentDomain);
  const [results, setResults] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const sequence = useRef(0), input = useRef(null);
  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setError(""); return; }
    const frame = window.requestAnimationFrame(() => input.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    const version = ++sequence.current;
    setResults([]); setError("");
    if (!open || !query.trim()) { setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await memoryApi.search({ query: query.trim(), domains: selectedDomain === "ALL" ? undefined : [selectedDomain], limit: 10 });
        if (version === sequence.current) setResults(Array.isArray(result) ? result : result?.results || []);
      } catch (reason) { if (version === sequence.current) setError(reason.message || "Could not search your memory."); }
      finally { if (version === sequence.current) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); sequence.current++; };
  }, [open, query, selectedDomain, refresh]);
  function actionFor(result) {
    if (result.sourceType !== currentDomain) return null;
    const date = sourceDate(result), id = sourceId(result);
    if (currentDomain === "NOTE" && id && onSelectNote) return { label: "Open note", run: () => onSelectNote(Number(id)) };
    if (["EXPENSE", "FOOD", "DIARY"].includes(currentDomain) && date && onSelectDate) return { label: "Open recorded day", run: () => onSelectDate(date) };
    if (currentDomain === "TASK" && id) return { label: "Open task", path: "/?task=" + id };
    if (currentDomain === "INVESTMENT" && id) return { label: "Open holding", path: "/holdings?holding=" + id };
    if (currentDomain === "HABIT" && id) return { label: "View habit history", path: "/history" };
    return null;
  }
  return <IntegrationDialog open={open} title="Search your memory" description="Find what you saved, using your own words." icon={Search} onClose={onClose} wide>
    <div className="memory-search-controls"><label className="memory-search-input"><Search size={18} /><span className="sr-only">Search saved records</span><input ref={input} type="search" maxLength={1000} placeholder="A meal, a purchase, an idea, a moment…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="coach-icon" type="button" onClick={() => { setQuery(""); input.current?.focus(); }} aria-label="Clear search"><X size={16} /></button>}</label>
      <div className="memory-filters" role="group" aria-label="Search space">{domains.map(item => <button type="button" key={item.id} aria-pressed={selectedDomain === item.id} onClick={() => setSelectedDomain(item.id)}>{item.label}</button>)}</div>
    </div>
    <div className="memory-results" aria-busy={loading}>
      {error && <div className="integration-error" role="alert"><p>{error}</p><button type="button" className="button button--secondary" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>}
      {loading && <div className="memory-state" role="status"><LoaderCircle className="spin" size={24} /><strong>Searching your saved records…</strong></div>}
      {!query.trim() && <div className="memory-state"><Database size={29} /><h3>A little context goes a long way</h3><p>Try “dinner with friends”, “my workout routine”, or a topic from your notes.</p><small>Semantic search when configured, with keyword search as a fallback.</small></div>}
      {!!query.trim() && !loading && !error && !results.length && <div className="memory-state"><Search size={27} /><h3>No matching records</h3><p>Try another phrase or search across all spaces.</p></div>}
      {results.map((result, index) => {
        const action = actionFor(result), date = sourceDate(result);
        return <article className="memory-result" key={result.id || result.sourceType + ":" + result.sourceId + ":" + index}><header><span className="memory-result__domain">{domains.find(item => item.id === result.sourceType)?.label || result.sourceType}</span>{date && <time dateTime={date}><CalendarDays size={12} />{date}</time>}<small>Match {index + 1}</small></header>
          {result.title && <h3>{result.title}</h3>}<p>{result.content || result.textSnippet || result.excerpt || "No text preview available."}</p>
          {action?.path ? <Link to={action.path} onClick={onClose}>{action.label}<ArrowUpRight size={14} /></Link> : action?.run ? <button type="button" onClick={() => { action.run(); onClose(); }}>{action.label}<ArrowUpRight size={14} /></button> : result.sourceType !== currentDomain ? <small>Saved in another Mira space</small> : null}
        </article>;
      })}
    </div>
    <footer className="memory-footer" role="status">{query.trim() && !loading && !error ? results.length + " matching records · best matches first" : "Only your saved, searchable records"}</footer>
  </IntegrationDialog>;
}
