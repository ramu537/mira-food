import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, X, Loader2, Calendar, Database, Tag } from "lucide-react";
import { memoryApi } from "../api/memory";

const DOMAINS = [
  { id: "FOOD", label: "Food Only" },
  { id: "ALL", label: "All Memory" },
  { id: "NOTE", label: "Notes" },
  { id: "DIARY", label: "Diary" },
  { id: "TASK", label: "Tasks" },
  { id: "EXPENSE", label: "Expenses" },
];

export default function AiMemorySearchDialog({ open, onClose, onSelectDate }) {
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("FOOD");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const domains = selectedDomain === "ALL" ? undefined : [selectedDomain];
        const res = await memoryApi.search({ query: query.trim(), domains, limit: 12 });
        setResults(res?.results || []);
      } catch (err) {
        setError(err?.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedDomain]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="dialog-card"
        style={{ maxWidth: "42rem", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-search-dialog-title"
      >
        <header className="dialog-header" style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--accent-strong)", display: "flex", alignItems: "center" }}>
              <Sparkles size={20} />
            </span>
            <h2 id="ai-search-dialog-title" style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              AI Vector Memory Search
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              ref={inputRef}
              type="text"
              className="text-input"
              style={{ width: "100%", paddingLeft: "2.75rem", fontSize: "1rem", borderRadius: "0.75rem" }}
              placeholder="Search past meals, foods, nutrition, or context..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
              <Loader2 size={18} className="spinning" style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--accent-strong)" }} />
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>Filter:</span>
            {DOMAINS.map((dom) => (
              <button
                key={dom.id}
                type="button"
                className={`button ${selectedDomain === dom.id ? "button--primary" : "button--ghost"}`}
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", borderRadius: "1rem", height: "auto" }}
                onClick={() => setSelectedDomain(dom.id)}
              >
                {dom.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.25rem" }}>
          {error && (
            <div style={{ color: "var(--danger)", fontSize: "0.875rem", background: "var(--danger-soft)", padding: "0.625rem", borderRadius: "0.5rem" }}>
              {error}
            </div>
          )}

          {!query.trim() && (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-tertiary)" }}>
              <Database size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Semantic Vector Search</p>
              <p style={{ fontSize: "0.8125rem", maxWidth: "26rem", margin: "0 auto" }}>
                Search across all your logged meals, recipes, and notes using natural language powered by Gemini 1536-dimensional embeddings.
              </p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
              <p>No matching memory entries found for "{query}".</p>
            </div>
          )}

          {results.map((res) => {
            const dateStr = res.entityDate || res.createdAt?.slice(0, 10);
            return (
              <div
                key={res.id || `${res.domain}-${res.entityId}`}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "0.75rem",
                  padding: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  transition: "background 0.15s ease",
                  cursor: dateStr ? "pointer" : "default",
                }}
                onClick={() => {
                  if (dateStr && onSelectDate) {
                    onSelectDate(dateStr);
                    onClose();
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.25rem",
                        background: res.domain === "FOOD" ? "var(--accent-soft)" : "var(--border-subtle)",
                        color: res.domain === "FOOD" ? "var(--accent-strong)" : "var(--text-primary)",
                      }}
                    >
                      {res.domain}
                    </span>
                    {dateStr && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={12} /> {dateStr}
                      </span>
                    )}
                  </div>
                  {res.similarityScore != null && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      Match: {Math.round(res.similarityScore * 100)}%
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                  {res.content || res.textSnippet || res.excerpt}
                </p>

                {dateStr && onSelectDate && (
                  <div style={{ fontSize: "0.75rem", color: "var(--accent-strong)", fontWeight: 600 }}>
                    Click to jump to date in Daily Log →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
