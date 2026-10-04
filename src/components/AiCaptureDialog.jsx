import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { captureApi } from "../api/captures";
import { acceptedCaptureImages, capturePhase, captureToday, validateCaptureImages } from "../lib/captureUi";
import IntegrationDialog from "./IntegrationDialog";

export default function AiCaptureDialog({ open, onClose, onSuccess, initialDate, targetDomain, title, description, placeholder, label, imageLabel = "Add photos or screenshots", images = true, dated = false, task = false, initialContext = "", onManual }) {
  const [text, setText] = useState(""), [date, setDate] = useState(initialDate || captureToday()), [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState([]), [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(null), [organization, setOrganization] = useState(null);
  const [pollPaused, setPollPaused] = useState(false);
  const input = useRef(null), writing = useRef(false), startedAt = useRef(0), sequence = useRef(0), notified = useRef(null);
  const textInput = useRef(null);
  useEffect(() => {
    if (!open || saved) return;
    const frame = window.requestAnimationFrame(() => textInput.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, saved]);
  const requestIntent = useRef(null);
  const [provider, setProvider] = useState(null);
  const [background, setBackground] = useState([]);
  const notify = useRef(onSuccess);
  useEffect(() => {
    if (!open) return;
    let stopped = false;
    captureApi.providerStatus().then(value => { if (!stopped) setProvider(value); }).catch(() => {});
    return () => { stopped = true; };
  }, [open]);
  useEffect(() => { notify.current = onSuccess; }, [onSuccess]);
  useEffect(() => { if (open && !saved) { setDate(initialDate || captureToday()); setError(""); } }, [open, initialDate, targetDomain]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  useEffect(() => () => { sequence.current++; }, []);
  function publish(message) {
    try { Promise.resolve(notify.current?.(message)).catch(() => {}); } catch { /* A page refresh must not mark a saved capture as failed. */ }
  }
  const phase = capturePhase(organization);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current && phase === "complete") {
      sequence.current++; setSaved(null); setOrganization(null); setError(""); setPollPaused(false);
    }
    wasOpen.current = open;
  }, [open, phase]);
  useEffect(() => {
    if (!saved || phase !== "processing" || pollPaused) return;
    let stopped = false, timer;
    const version = sequence.current;
    async function sync() {
      if (stopped) return;
      if (Date.now() - startedAt.current > 15 * 60 * 1000) { setPollPaused(true); return; }
      if (document.visibilityState !== "visible") { timer = window.setTimeout(sync, 5000); return; }
      try {
        const result = await captureApi.organization(saved.id);
        if (stopped || version !== sequence.current) return;
        setOrganization(result); setError("");
        if (capturePhase(result) === "complete" && notified.current !== saved.id) {
          notified.current = saved.id;
          publish(result.receipt?.summary || "Your capture has been added to your records.");
        }
      } catch (reason) { if (!stopped && version === sequence.current) setError(reason.message || "Could not check progress. The capture is already saved."); }
      if (!stopped) timer = window.setTimeout(sync, 3000);
    }
    sync();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [saved?.id, phase, pollPaused]);

  function choose(event) {
    try {
      const next = validateCaptureImages([...files, ...Array.from(event.target.files || [])]);
      setFiles(next); setError("");
    } catch (reason) { setError(reason.message); }
    event.target.value = "";
  }
  async function submit(event) {
    event.preventDefault();
    if (writing.current || saved) return;
    const content = [initialContext, text.trim(), task && dueDate ? "Requested task due date: " + dueDate : ""].filter(Boolean).join("\n");
    if (!text.trim() && !files.length) { setError("Add a description or a photo to begin."); return; }
    if (content.length > 4000) { setError("Keep the description and date instructions within 4,000 characters."); return; }
    writing.current = true; setBusy(true); setError(""); const version = sequence.current;
    try {
      const payload = { text: content || title + " from image", captureDate: date || initialDate || captureToday(), targetDomain };
      const previous = requestIntent.current;
      if (!previous || JSON.stringify(previous.payload) !== JSON.stringify(payload) ||
          previous.files.length !== files.length || previous.files.some((file, index) => file !== files[index])) {
        requestIntent.current = { payload, files: [...files], key: crypto.randomUUID() };
      }
      const intent = requestIntent.current;
      const result = files.length ? await captureApi.createWithImages(intent.payload, intent.files, intent.key) : await captureApi.create(intent.payload, intent.key);
      requestIntent.current = null;
      if (version !== sequence.current) return;
      startedAt.current = Date.now(); setSaved(result); setOrganization(null); setPollPaused(false);
      setText(""); setFiles([]); setDueDate("");
      publish("Capture saved. AI is organizing it; your records will refresh when ready.");
    } catch (reason) { if (version === sequence.current) setError((reason.message || "Could not confirm this capture. Your draft is still here.") + " Retry the same input to reuse its save reference."); }
    finally { writing.current = false; if (version === sequence.current) setBusy(false); }
  }
  async function retry() {
    if (writing.current || !saved) return;
    writing.current = true; setBusy(true); setError("");
    const version = sequence.current;
    try {
      // Retry the existing capture, never upload/create a duplicate.
      await captureApi.organize(saved.id);
      if (version === sequence.current) { startedAt.current = Date.now(); setOrganization(null); setPollPaused(false); }
    } catch (reason) { if (version === sequence.current) setError(reason.message); }
    finally { writing.current = false; if (version === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    const pending = background.filter(job => capturePhase(job.result) === "processing" && !job.paused);
    if (!pending.length) return;
    let stopped = false, timer;
    async function syncBackground() {
      if (stopped) return;
      if (document.visibilityState !== "visible") { timer = window.setTimeout(syncBackground, 5000); return; }
      const updates = await Promise.all(pending.map(async job => {
        if (Date.now() - job.started > 15 * 60 * 1000) return { ...job, paused: true };
        try { return { ...job, result: await captureApi.organization(job.id), error: "" }; }
        catch (failure) { return { ...job, error: failure.message || "Progress unavailable; your capture is saved." }; }
      }));
      if (stopped) return;
      setBackground(current => current.map(job => updates.find(next => next.id === job.id) || job));
      updates.filter(job => capturePhase(job.result) === "complete").forEach(job => publish(job.result.receipt?.summary || "Your earlier capture has been added."));
    }
    timer = window.setTimeout(syncBackground, 3000);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [background]);
  async function retryBackground(job) {
    if (writing.current) return;
    writing.current = true; setBusy(true);
    try {
      if (["failed", "review"].includes(capturePhase(job.result))) await captureApi.organize(job.id);
      setBackground(current => current.map(item => item.id === job.id ? { ...item, result: null, paused: false, started: Date.now(), error: "" } : item));
    } catch (failure) {
      setBackground(current => current.map(item => item.id === job.id ? { ...item, error: failure.message } : item));
    } finally { writing.current = false; setBusy(false); }
  }
  function another() {
    if (saved && phase !== "complete") setBackground(current => [...current.filter(job => job.id !== saved.id), {
      id: saved.id, result: organization, started: startedAt.current, paused: pollPaused, error: ""
    }]);
    requestIntent.current = null;
    sequence.current++; setSaved(null); setOrganization(null); setError(""); setPollPaused(false); setDate(initialDate || captureToday()); }
  return <IntegrationDialog open={open} title={title} description={description} icon={Sparkles} busy={busy} onClose={onClose}>
    {saved ? <div className="capture-result">
      <span className={"capture-result__mark is-" + phase}>{phase === "complete" ? <CheckCircle2 size={30} /> : phase === "processing" && !pollPaused ? <LoaderCircle className="spin" size={28} /> : <Sparkles size={28} />}</span>
      <h3>{phase === "complete" ? "Added to your records" : phase === "failed" ? "Saved, but not organized yet" : phase === "review" ? "Saved, but needs another pass" : pollPaused ? "Your capture is saved" : "Saved. Mira is organizing it."}</h3>
      <p>{phase === "complete" ? organization.receipt?.summary || "Your records have been refreshed." : phase === "review" ? "The AI could not finish automatically. Retry organizing this saved capture; do not log a second copy." : phase === "failed" ? "No need to upload again. Retry organizing this saved capture." : "You can close this window and carry on. Processing continues in the backend."}</p>
      <small>Capture #{saved.id} · {targetDomain.toLowerCase()}</small>
      {error && <p className="integration-error" role="alert">{error}</p>}
      <div className="capture-result__actions">
        {(phase === "failed" || phase === "review") && <button className="button button--secondary" type="button" disabled={busy} onClick={retry}><RefreshCw size={16} /> Retry organizing</button>}
        {pollPaused && <button className="button button--secondary" type="button" onClick={() => { startedAt.current = Date.now(); setPollPaused(false); }}><RefreshCw size={16} /> Check progress</button>}
        <button className="button button--secondary" type="button" disabled={busy} onClick={another}>Capture another</button>
        <button className="button button--primary" type="button" disabled={busy} onClick={onClose}>{phase === "complete" ? "Done" : "Keep going"}</button>
      </div>
    </div> : <><div className="capture-entry-options">{provider?.configured === false && <p role="status">{provider.message}</p>}{onManual && <button className="button button--ghost" type="button" disabled={busy} onClick={onManual}>Enter manually instead</button>}</div><form className="capture-form" onSubmit={submit} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <label className="integration-field"><span>{label || "Describe it in your own words"}</span><textarea ref={textInput} className="text-input" rows={4} maxLength={4000} placeholder={placeholder} value={text} onChange={event => { setText(event.target.value); setError(""); }} disabled={busy} /></label>
      {(dated || task) && <details className="capture-options"><summary>Date and details · optional</summary><div className="capture-date-row">{dated && <label className="integration-field"><span>Date <small>Defaults to the selected day</small></span><input className="text-input" type="date" value={date} onChange={event => setDate(event.target.value)} disabled={busy} /></label>}
        {task && <label className="integration-field"><span>Due date <small>optional</small></span><input className="text-input" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={busy} /></label>}</div></details>}
      {images && <section className="capture-attachments" aria-label="Image attachments"><input ref={input} className="sr-only" tabIndex={-1} type="file" accept={acceptedCaptureImages.join(",")} multiple onChange={choose} disabled={busy} />
        <div className="capture-previews">{previews.map((url, index) => <figure key={url}><img src={url} alt={files[index]?.name || "Selected image"} /><button type="button" disabled={busy} aria-label={"Remove " + (files[index]?.name || "image")} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={16} /></button><figcaption>{files[index]?.name}</figcaption></figure>)}</div>
        {files.length < 3 && <button className="capture-upload" type="button" disabled={busy} onClick={() => input.current?.click()}><Camera size={19} /><span>{imageLabel}<small>JPG, PNG or WebP · up to 3 images · 5 MB each</small></span></button>}
      </section>}
      {error && <p className="integration-error" role="alert">{error}</p>}
      <footer className="capture-footer"><p>AI organizes your input. Estimates remain labelled and you can edit the saved records.</p><button className="button button--primary" type="submit" disabled={busy || !text.trim() && !files.length}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{busy ? "Saving…" : "Save with AI"}</button></footer>
    </form></>}
    {background.length > 0 && <details className="capture-options"><summary>{background.length} earlier saved {background.length === 1 ? "capture" : "captures"}</summary>{background.map(job => {
      const jobPhase = capturePhase(job.result);
      return <div className="capture-background" key={job.id}><p>Capture #{job.id} · {jobPhase === "complete" ? job.result.receipt?.summary || "Added to your records" : job.paused ? "Saved; check progress when ready" : jobPhase === "processing" ? "Saved; processing in the background" : "Saved; organization needs another pass"}</p>{job.error && <p>{job.error}</p>}
        {(["failed", "review"].includes(jobPhase) || job.paused) && <button className="button button--secondary" type="button" disabled={busy} onClick={() => retryBackground(job)}>Retry / check saved capture</button>}
        {jobPhase === "complete" && <button className="button button--ghost" type="button" onClick={() => setBackground(current => current.filter(item => item.id !== job.id))}>Dismiss status</button>}
      </div>;
    })}</details>}
  </IntegrationDialog>;
}
