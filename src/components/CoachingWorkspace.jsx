import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, Check, ChevronLeft, Copy, History, LoaderCircle, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { isPendingConversation as pending, recordPath, mergeCoachTurns, shouldFollowMessages, coachBlocks } from "../lib/coachChat";
import "../coaching.css";

const starters = {
  expenses: ["What changed in my spending this month?", "Can my budget accommodate a trip or a new phone?"],
  food: ["What would be a useful next meal?", "Compare my recent weeks and suggest one improvement."],
  habits: ["Which routine needs a different approach?", "Help me make my workout, sleep and study more consistent."],
  tasks: ["What should I focus on next?", "Make a realistic plan from my current workload."],
  notes: ["Find connections and unfinished actions in my notes.", "Explain a topic using my saved notes."],
  diary: ["Help me reflect on my recent entries.", "What patterns can you see in my recorded days?"],
  experiences: ["Help me shape my trip into a day-by-day story.", "What would make this story useful to another traveller?"],
  investments: ["Explain my allocation and valuation gaps.", "Compare scenarios using my recorded holdings."],
};

// React renders every fragment as text; model output never becomes executable HTML.
function InlineText({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part);
}
function Prose({ text }) {
  return <div className="coach-prose">{coachBlocks(text).map((block, index) =>
    block.type === "code" ? <pre key={index}><code>{block.text}</code></pre>
      : block.type === "heading" ? <h4 key={index}><InlineText text={block.text} /></h4>
      : block.type === "list" ? (block.ordered ? <ol key={index}>{block.items.map((item, i) => <li key={i}><InlineText text={item} /></li>)}</ol>
        : <ul key={index}>{block.items.map((item, i) => <li key={i}><InlineText text={item} /></li>)}</ul>)
      : <p key={index}><InlineText text={block.text} /></p>)}</div>;
}
function Answer({ turn, domain, onNavigate, onRetry, busy }) {
  const answer = turn.answer;
  const [copyState, setCopyState] = useState("");
  const copyTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText([answer.answer, ...(answer.nextSteps || [])].join("\n\n"));
      setCopyState("Copied");
    } catch { setCopyState("Copy unavailable"); }
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState(""), 2200);
  }
  return <article className="coach-turn">
    <div className="coach-question"><span className="sr-only">You asked</span><p>{turn.question}</p></div>
    {pending(turn) && <div role="status" className="coach-status"><LoaderCircle size={16} className="spin" /><span>Looking through your records<span className="coach-status__detail">You can minimize this chat. Your answer will be saved.</span></span></div>}
    {turn.status === "FAILED" && <div role="alert" className="coach-error"><p>{turn.error || "This answer could not be prepared. Your question is saved."}</p><button type="button" disabled={busy} onClick={() => onRetry(turn)}>Retry question</button></div>}
    {answer && <div className="coach-answer">
      <div className="coach-answer__identity"><span className="coach-answer__mark"><MessageCircle size={13} /></span><strong>Mira assistant</strong>
        <button className="coach-icon" type="button" onClick={copyAnswer} aria-label="Copy answer" title="Copy answer">{copyState === "Copied" ? <Check size={15} /> : <Copy size={15} />}</button><span className="sr-only" role="status">{copyState}</span></div>
      <Prose text={answer.answer} />
      {!!answer.nextSteps?.length && <section className="coach-next-steps"><h4>Try this next</h4><ul>{answer.nextSteps.map((step, index) => <li key={index}><InlineText text={step} /></li>)}</ul></section>}
      {!!answer.assumptions?.length && <details className="coach-detail"><summary>Assumptions & estimates</summary><ul>{answer.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
      {!!answer.evidence?.length && <details className="coach-detail coach-evidence"><summary>Sources & calculations · {answer.evidence.length}</summary>
        {answer.evidence.map((query, index) => <section key={query.id}>
          <h4>{answer.citations?.find(citation => citation.queryId === query.id)?.label || "Query " + (index + 1)}</h4>
          <p>{query.coverage}</p>{query.truncated && <p>These rows are a partial result. Ask for a narrower range or the next page.</p>}
          <details><summary>View query</summary><pre>{query.sql}</pre></details>
          {!!query.rows?.length && <div className="coach-table-wrap" tabIndex={0} aria-label="Scrollable supporting records"><table><caption className="sr-only">Supporting records for query {index + 1}</caption><thead><tr>{Object.keys(query.rows[0]).map(key => <th scope="col" key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>
            {query.rows.map((row, rowIndex) => <tr key={rowIndex}>{Object.entries(row).map(([key, value]) => <td key={key}>
              {key === "id" && recordPath(domain, query, row) ? <Link onClick={onNavigate} to={recordPath(domain, query, row)}>Open #{value}</Link> : value === null ? "Unknown" : typeof value === "object" ? JSON.stringify(value) : String(value)}
            </td>)}</tr>)}
          </tbody></table></div>}{!query.rows?.length && <p>No matching records.</p>}
        </section>)}
      </details>}
      {answer.coverage && <p className="coach-coverage">{answer.coverage}</p>}
      {answer.generatedAt && <time className="coach-time" dateTime={answer.generatedAt}>{new Date(answer.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{answer.schemaEscalated ? " · Deeper analysis" : ""}</time>}
    </div>}
  </article>;
}

export default function CoachingWorkspace({ domain, date, onNavigate, active = true }) {
  const base = "/coaching/" + domain;
  const id = useId();
  const [conversations, setConversations] = useState([]), [selected, setSelected] = useState("");
  const [turns, setTurns] = useState([]), [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false), [historyOffset, setHistoryOffset] = useState(0), [hasOlder, setHasOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false), [showLatest, setShowLatest] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const epoch = useRef(0), request = useRef(null), textarea = useRef(null), messages = useRef(null), readSequence = useRef(0), listSequence = useRef(0);
  const followMessages = useRef(true), olderOffset = useRef(0);
  const latestTurn = turns.at(-1);
  const waiting = turns.some(pending);

  function scrollToLatest() {
    const node = messages.current;
    if (node) node.scrollTop = node.scrollHeight;
    followMessages.current = true; setShowLatest(false);
  }
  useEffect(() => {
    if (!active) return;
    if (followMessages.current) scrollToLatest();
    else setShowLatest(true);
  }, [latestTurn?.id, latestTurn?.status, active]);
  useEffect(() => {
    if (!historyOpen && active && followMessages.current) {
      const frame = window.requestAnimationFrame(scrollToLatest);
      return () => window.cancelAnimationFrame(frame);
    }
  }, [historyOpen, active]);
  useEffect(() => () => { epoch.current++; }, []);
  async function list(offset = 0) {
    const version = epoch.current, sequence = offset ? null : ++listSequence.current;
    const result = await apiRequest(base + "/conversations?offset=" + offset);
    if (version !== epoch.current || sequence !== null && sequence !== listSequence.current) return;
    setConversations(current => offset ? [...current, ...result.filter(item => !current.some(c => c.id === item.id))] : result);
    setHasMore(result.length === 30);
  }
  useEffect(() => {
    if (!active) return;
    const version = epoch.current;
    list().catch(reason => { if (version === epoch.current) setError(reason.message); });
  }, [base, active]);
  async function read(conversationId, offset = 0) {
    const version = epoch.current, sequence = offset ? null : ++readSequence.current;
    const result = await apiRequest(base + "/conversations/" + conversationId + "?offset=" + offset);
    if (version !== epoch.current || sequence !== null && sequence !== readSequence.current) return null;
    setError(""); setTurns(current => mergeCoachTurns(current, result));
    if (offset || olderOffset.current === 0) setHasOlder(result.length === 40);
    return result;
  }
  async function select(conversationId) {
    epoch.current++; request.current = null; olderOffset.current = 0; followMessages.current = true;
    setSelected(conversationId); setTurns([]); setError(""); setHistoryOffset(0); setHasOlder(false); setShowLatest(false); setHistoryOpen(false); setDeleteArmed(false);
    if (!conversationId) { setLoading(false); window.requestAnimationFrame(() => textarea.current?.focus()); return; }
    setLoading(true); const version = epoch.current;
    try { await read(conversationId); } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setLoading(false); }
  }
  useEffect(() => {
    if (!selected || !active && !waiting) return undefined;
    const sync = () => {
      const version = epoch.current;
      if (document.visibilityState === "visible") read(selected).catch(reason => { if (version === epoch.current) setError(reason.message); });
    };
    sync();
    const timer = window.setInterval(sync, waiting ? active ? 2500 : 10000 : 30000);
    window.addEventListener("focus", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", sync); };
  }, [selected, waiting, active]);

  async function send(event) {
    event.preventDefault();
    if (busy || loading || waiting || !draft.trim()) return;
    const version = epoch.current, question = draft.trim();
    // Keep these IDs across a lost response: retrying cannot submit the question twice.
    if (!request.current || request.current.question !== question || request.current.selected !== selected || request.current.date !== date)
      request.current = { conversationId: selected || crypto.randomUUID(), requestId: crypto.randomUUID(), question, selected, date };
    const payload = { conversationId: request.current.conversationId, requestId: request.current.requestId, question, contextDate: date };
    setBusy(true); setError(""); followMessages.current = true;
    try {
      const turn = await apiRequest(base + "/messages", { method: "POST", body: JSON.stringify(payload) });
      if (version !== epoch.current) return;
      setSelected(turn.conversationId); setTurns(current => mergeCoachTurns(current, [turn]));
      setDraft(""); request.current = null; setDeleteArmed(false);
      list().catch(() => {});
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) { setBusy(false); textarea.current?.focus(); } }
  }
  async function retry(turn) {
    setBusy(true); setError(""); const version = epoch.current;
    try {
      const updated = await apiRequest(base + "/conversations/" + selected + "/turns/" + turn.id + "/retry", { method: "POST" });
      if (version === epoch.current) { readSequence.current++; setTurns(current => mergeCoachTurns(current, [updated])); }
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function remove() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    setBusy(true); setError(""); const version = epoch.current;
    try {
      await apiRequest(base + "/conversations/" + selected, { method: "DELETE" });
      if (version !== epoch.current) return;
      await select(""); await list();
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { setBusy(false); }
  }
  async function older() {
    setBusy(true); const offset = historyOffset + 40, version = epoch.current;
    const node = messages.current, previousHeight = node?.scrollHeight || 0, previousTop = node?.scrollTop || 0;
    followMessages.current = false;
    try {
      if (await read(selected, offset) && version === epoch.current) {
        setHistoryOffset(offset); olderOffset.current = offset;
        window.requestAnimationFrame(() => {
          if (version === epoch.current && messages.current) messages.current.scrollTop = previousTop + messages.current.scrollHeight - previousHeight;
        });
      }
    } catch (reason) { if (version === epoch.current) setError(reason.message); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  const title = conversations.find(item => item.id === selected)?.title || (selected ? "Current conversation" : "New conversation");
  return <section className="coach-chat" aria-label="Personal assistant conversation">
    <div className="coach-toolbar">
      <button className="coach-history-toggle" type="button" disabled={busy} aria-expanded={historyOpen} aria-controls={id + "-history"} onClick={() => setHistoryOpen(value => !value)}><History size={15} /><span>{historyOpen ? "Conversation history" : title}</span></button>
      <button className="coach-icon" type="button" disabled={busy} onClick={() => select("")} aria-label="Start a new conversation" title="New conversation"><Plus size={18} /></button>
    </div>
    {historyOpen && <div id={id + "-history"} className="coach-history">
      <div className="coach-history__heading"><span>Your conversations</span><button className="coach-icon" type="button" onClick={() => setHistoryOpen(false)} aria-label="Back to chat"><ChevronLeft size={16} /></button></div>
      {!conversations.length && <p>No saved conversations yet.</p>}
      <div className="coach-history__list">{conversations.map(item => <button key={item.id} type="button" disabled={busy} aria-pressed={selected === item.id} onClick={() => select(item.id)}><MessageCircle size={15} /><span><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></span></button>)}</div>
      {hasMore && <button type="button" disabled={busy} onClick={() => list(conversations.length).catch(reason => setError(reason.message))}>Load more conversations</button>}
      {selected && <div className="coach-history__delete"><button type="button" disabled={busy} onClick={remove}><Trash2 size={14} />{deleteArmed ? "Confirm delete conversation" : "Delete current conversation"}</button>{deleteArmed && <button type="button" onClick={() => setDeleteArmed(false)}>Cancel</button>}<small>Only the conversation is removed. Your records stay unchanged.</small></div>}
    </div>}
    {error && <div role="alert" className="coach-error"><p>{error}</p><button type="button" disabled={busy} onClick={() => { setError(""); (selected ? read(selected) : list()).catch(reason => setError(reason.message)); }}>Refresh</button></div>}
    <p className="sr-only" role="status">{latestTurn?.status === "COMPLETED" ? "Your assistant’s answer is ready." : ""}</p>
    <div className="coach-message-region" hidden={historyOpen}>
      <div ref={messages} className="coach-messages" onScroll={event => { followMessages.current = shouldFollowMessages(event.currentTarget); if (followMessages.current) setShowLatest(false); }}>
        {loading && <p role="status" className="coach-status"><LoaderCircle size={16} className="spin" />Loading conversation…</p>}
        {hasOlder && <button className="coach-older" type="button" disabled={busy} onClick={older}>Load earlier messages</button>}
        {turns.map(turn => <Answer key={turn.id} turn={turn} domain={domain} onNavigate={onNavigate} onRetry={retry} busy={busy || waiting} />)}
        {!loading && !turns.length && <div className="coach-welcome"><span className="coach-welcome__mark"><MessageCircle size={24} /></span><h3>What’s on your mind?</h3><p>Ask about your records, compare periods, or explore a decision together.</p>
          <div className="coach-starters">{(starters[domain] || []).map(question => <button key={question} type="button" onClick={() => { setDraft(question); textarea.current?.focus(); }}>{question}<span aria-hidden="true">↗</span></button>)}</div></div>}
      </div>
      {showLatest && <button className="coach-jump" type="button" onClick={scrollToLatest}><ArrowDown size={14} /> Latest message</button>}
    </div>
    <form className="coach-composer" hidden={historyOpen} onSubmit={send}>
      <label className="sr-only" htmlFor={id + "-question"}>Message your assistant</label>
      <div className="coach-composer__input"><textarea ref={textarea} id={id + "-question"} value={draft} maxLength={8000} rows={2} placeholder={waiting ? "You can draft your follow-up while I work…" : "Ask Mira anything about your records…"} onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
        <button className="coach-send" type="submit" aria-label={busy ? "Sending message" : "Send message"} title="Send (Ctrl / ⌘ + Enter)" disabled={busy || loading || waiting || !draft.trim()}>{busy ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}</button></div>
      <div className="coach-composer__meta"><span>{waiting ? "Answer in progress · your draft stays here" : "Based on your records · estimates labelled"}</span><span>{draft.length > 7400 ? draft.length + "/8000" : "Ctrl / ⌘ ↵"}</span></div>
    </form>
  </section>;
}
