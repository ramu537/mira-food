import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { apiRequest } from "../api/client";
import "../coaching.css";

const starters = {
  expenses: ["What changed in my spending, and what should I do next?", "Help me evaluate a purchase using my budget and recent spending."],
  food: ["What should my next meal look like based on what I ate?", "Compare my recorded weeks and suggest a practical improvement."],
  habits: ["Which routines need a different approach, and why?", "Help me make my workout, sleep and study routines easier to maintain."],
  tasks: ["What should I focus on next, and what can wait?", "Review my workload and help me create a realistic plan."],
  notes: ["Find connections and useful unfinished actions in my notes.", "Help me understand a topic using my saved writing."],
  diary: ["Help me reflect on my recent entries without jumping to conclusions.", "Help me turn my trip memories into a day-by-day story."],
  experiences: ["Help me develop my trip story from its days, stays and activities.", "What details would make this experience more useful to someone else?"],
  investments: ["Explain my allocation, valuation gaps and upcoming dates.", "Compare scenarios using my recorded holdings and explicit assumptions."],
};
import { isPendingConversation as pending, recordPath } from "../lib/coachChat";
function Answer({ turn, domain, onNavigate, onRetry, busy }) {
  const answer = turn.answer;
  return <article className="coach-turn">
    <div className="coach-question"><strong>You</strong><p>{turn.question}</p></div>
    {pending(turn) && <p role="status" className="coach-status">Investigating your records… You can close this window; the answer will be saved.</p>}
    {turn.status === "FAILED" && <div role="alert"><p>{turn.error || "Could not prepare this answer."}</p><button type="button" disabled={busy} onClick={() => onRetry(turn)}>Retry this question</button></div>}
    {answer && <div className="coach-answer">
      <strong>Your assistant</strong><p className="coach-prose">{answer.answer}</p>
      {!!answer.nextSteps?.length && <section><h4>Useful next steps</h4><ul>{answer.nextSteps.map((step, index) => <li key={index}>{step}</li>)}</ul></section>}
      {!!answer.assumptions?.length && <details><summary>Assumptions & estimates</summary><ul>{answer.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
      <small>{answer.engine} · {answer.generatedAt ? new Date(answer.generatedAt).toLocaleString(undefined, { timeZone: "Asia/Kolkata" }) : ""}{answer.schemaEscalated ? " · Deeper schema investigation" : ""}</small>
      <p className="coach-coverage">{answer.coverage}</p>
      {!!answer.evidence?.length && <details className="coach-evidence"><summary>Supporting queries & records ({answer.evidence.length})</summary>
        {answer.evidence.map((query, index) => <section key={query.id}>
          <h4>{answer.citations?.find(citation => citation.queryId === query.id)?.label || "Query " + (index + 1)}</h4>
          <p>{query.coverage}</p>{query.truncated && <p>Result truncated. Ask for a narrower range or the next page; these rows are not a complete total.</p>}
          <details><summary>Calculation / query</summary><pre>{query.sql}</pre></details>
          <div className="coach-table-wrap"><table><thead><tr>{Object.keys(query.rows?.[0] || {}).map(key => <th key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>
            {query.rows?.map((row, rowIndex) => <tr key={rowIndex}>{Object.entries(row).map(([key, value]) => <td key={key}>
              {key === "id" && recordPath(domain, query, row) ? <Link onClick={onNavigate} to={recordPath(domain, query, row)}>Open #{value}</Link> : value === null ? "Unknown" : typeof value === "object" ? JSON.stringify(value) : String(value)}
            </td>)}</tr>)}
          </tbody></table></div>{!query.rows?.length && <p>No matching records.</p>}
        </section>)}
      </details>}
    </div>}
  </article>;
}

function Chat({ domain, date, onNavigate, active }) {
  const base = "/coaching/" + domain;
  const [conversations, setConversations] = useState([]), [selected, setSelected] = useState("");
  const [turns, setTurns] = useState([]), [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0), [hasOlder, setHasOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const epoch = useRef(0), request = useRef(null), textarea = useRef(null), messages = useRef(null), readSequence = useRef(0);
  const latestTurn = turns.at(-1);
  useEffect(() => { if (messages.current) messages.current.scrollTop = messages.current.scrollHeight; }, [latestTurn?.id, latestTurn?.status]);
  useEffect(() => () => { epoch.current++; }, []);
  async function list(offset = 0) {
    const version = epoch.current;
    const result = await apiRequest(base + "/conversations?offset=" + offset);
    if (version !== epoch.current) return;
    setConversations(current => offset ? [...current, ...result.filter(item => !current.some(c => c.id === item.id))] : result);
    setHasMore(result.length === 30);
  }
  useEffect(() => {
    let active = true;
    list().catch(reason => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base]);
  async function read(id, offset = 0) {
    const version = epoch.current, sequence = offset ? null : ++readSequence.current;
    const result = await apiRequest(base + "/conversations/" + id + "?offset=" + offset);
    if (version !== epoch.current || sequence !== null && sequence !== readSequence.current) return;
    setTurns(current => offset ? [...result, ...current.filter(turn => !result.some(item => item.id === turn.id))]
      : [...current.filter(turn => !result.some(item => item.id === turn.id) && !pending(turn)), ...result]);
    if (offset || historyOffset === 0) setHasOlder(result.length === 40);
    return result;
  }
  async function select(id) {
    epoch.current++; request.current = null; setSelected(id); setTurns([]); setError(""); setHistoryOffset(0); setHasOlder(false);
    if (!id) { setLoading(false); textarea.current?.focus(); return; }
    setLoading(true); const version = epoch.current;
    try { await read(id); } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setLoading(false); }
  }
  const waiting = turns.some(pending);
  useEffect(() => {
    if (!selected || !active) return undefined;
    const sync = () => {
      const version = epoch.current;
      if (document.visibilityState === "visible") read(selected).catch(reason => { if (version === epoch.current) setError(reason.message); });
    };
    sync();
    const timer = window.setInterval(sync, waiting ? 2500 : 30000);
    window.addEventListener("focus", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", sync); };
  }, [selected, waiting, active]);
  async function send(event) {
    event.preventDefault();
    if (busy || waiting || !draft.trim()) return;
    const version = epoch.current, question = draft.trim();
    if (!request.current || request.current.question !== question || request.current.selected !== selected || request.current.date !== date)
      request.current = { conversationId: selected || crypto.randomUUID(), requestId: crypto.randomUUID(), question, selected, date };
    const payload = { conversationId: request.current.conversationId, requestId: request.current.requestId, question, contextDate: date };
    setBusy(true); setError("");
    try {
      const turn = await apiRequest(base + "/messages", { method: "POST", body: JSON.stringify(payload) });
      if (version !== epoch.current) return;
      setSelected(turn.conversationId); setTurns(current => [...current.filter(item => item.id !== turn.id), turn]);
      setDraft(""); request.current = null;
      list().catch(() => {}); // A list refresh failure must never obscure the successfully submitted question.
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function retry(turn) {
    setBusy(true); setError(""); const version = epoch.current;
    try {
      const updated = await apiRequest(base + "/conversations/" + selected + "/turns/" + turn.id + "/retry", { method: "POST" });
      if (version === epoch.current) setTurns(current => current.map(item => item.id === turn.id ? updated : item));
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(""); const version = epoch.current;
    try {
      await apiRequest(base + "/conversations/" + selected, { method: "DELETE" });
      if (version !== epoch.current) return;
      await select(""); await list();
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { setBusy(false); }
  }
  async function older() {
    setBusy(true); const offset = historyOffset + 40;
    try { await read(selected, offset); setHistoryOffset(offset); } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <section className="coach-chat" aria-label="Personal coaching conversation">
    <div className="coach-toolbar">
      <label>Conversation<select value={selected} disabled={busy} onChange={event => select(event.target.value)}><option value="">New conversation</option>{selected && !conversations.some(item => item.id === selected) && <option value={selected}>Current conversation</option>}{conversations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <button type="button" disabled={busy} onClick={() => select("")} aria-label="New conversation"><Plus size={17} /></button>
      {selected && <button type="button" disabled={busy} onClick={remove} aria-label="Delete this conversation" title="Delete this conversation"><Trash2 size={17} /></button>}
    </div>
    {hasMore && <button type="button" disabled={busy} onClick={() => list(conversations.length).catch(reason => setError(reason.message))}>More conversations</button>}
    {error && <div role="alert" className="coach-error"><p>{error}</p><button type="button" disabled={busy} onClick={() => { setError(""); (selected ? read(selected) : list()).catch(reason => setError(reason.message)); }}>Refresh conversation</button></div>}
    {loading && <p role="status">Loading conversations…</p>}
    {hasOlder && <button type="button" disabled={busy} onClick={older}>Earlier messages</button>}
    <div ref={messages} className="coach-messages" aria-live="polite" aria-relevant="additions text">
      {turns.map(turn => <Answer key={turn.id} turn={turn} domain={domain} onNavigate={onNavigate} onRetry={retry} busy={busy || waiting} />)}
      {!loading && !turns.length && <div className="coach-welcome"><MessageCircle size={26} /><h3>Ask something that matters to you.</h3><p>I can investigate your saved records, compare periods, explore scenarios and help you decide a useful next step.</p>
        <div className="coach-starters">{(starters[domain] || []).map(question => <button key={question} type="button" onClick={() => { setDraft(question); textarea.current?.focus(); }}>{question}</button>)}</div></div>}
    </div>
    <form className="coach-composer" onSubmit={send}>
      <label htmlFor={"coach-question-" + domain}>Ask your assistant</label>
      <textarea ref={textarea} id={"coach-question-" + domain} value={draft} maxLength={8000} rows={3} placeholder="Ask a detailed question, or follow up on an answer…" onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
      <div><small>Estimates are labelled. Coaching does not change your records. Ctrl/⌘ + Enter to send.</small><button className="button button--primary" type="submit" disabled={busy || waiting || !draft.trim()}><Send size={16} />{busy ? "Sending…" : "Ask"}</button></div>
    </form>
  </section>;
}
export default function CoachingWorkspace({ domain, userId, date, onNavigate, children, active = true }) {
  const [tab, setTab] = useState("insights");
  const [visited, setVisited] = useState(false);
  const id = "coach-panel-" + domain;
  function switchTab(next) {
    setTab(next);
    if (next === "chat") setVisited(true);
    document.getElementById(id + "-" + next + "-tab")?.focus();
  }
  function tabKeys(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    switchTab(event.key === "Home" ? "insights" : event.key === "End" ? "chat" : tab === "chat" ? "insights" : "chat");
  }
  return <div className="coaching-workspace">
    <div className="coach-tabs" role="tablist" aria-label="Intelligence views" onKeyDown={tabKeys}>
      <button id={id + "-insights-tab"} role="tab" tabIndex={tab === "insights" ? 0 : -1} aria-selected={tab === "insights"} aria-controls={id + "-insights"} type="button" onClick={() => setTab("insights")}>Insights</button>
      <button id={id + "-chat-tab"} role="tab" tabIndex={tab === "chat" ? 0 : -1} aria-selected={tab === "chat"} aria-controls={id + "-chat"} type="button" onClick={() => { setVisited(true); setTab("chat"); }}><MessageCircle size={16} /> Ask your assistant</button>
    </div>
    <div id={id + "-insights"} role="tabpanel" aria-labelledby={id + "-insights-tab"} hidden={tab !== "insights"}>{children}</div>
    <div id={id + "-chat"} role="tabpanel" aria-labelledby={id + "-chat-tab"} hidden={tab !== "chat"}>
      {visited && <Chat key={domain + ":" + userId} domain={domain} date={date} onNavigate={onNavigate} active={active && tab === "chat"} />}
    </div>
  </div>;
}
