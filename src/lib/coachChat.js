export const isPendingConversation = turn => ["PENDING", "PROCESSING"].includes(turn.status);
export function recordPath(domain, query, row) {
  if (!/^\d+$/.test(String(row.id ?? ""))) return null;
  const matches = [...query.sql.matchAll(/\b(?:from|join)\s+(coach_[a-z_]+)/gi)].map(match => match[1].toLowerCase());
  if (new Set(matches).size !== 1) return null;
  const table = matches[0], id = row.id;
  if (domain === "tasks" && table === "coach_tasks") return "/?task=" + id;
  if (domain === "notes" && table === "coach_notes") return "/?note=" + id;
  if (domain === "investments" && table === "coach_investment_holdings") return "/holdings?holding=" + id;
  if (["diary", "experiences"].includes(domain) && table === "coach_experiences") return "/experiences/" + id;
  if (domain === "diary" && table === "coach_diary_entries" && row.entry_date) return "/entry?date=" + row.entry_date;
  return null;
}

/** Merge paginated/polled turns without dropping earlier messages or duplicating a write. */
export function mergeCoachTurns(current, incoming) {
  const byId = new Map(current.map(turn => [turn.id, turn]));
  incoming.forEach(turn => byId.set(turn.id, turn));
  return Array.from(byId.values()).sort((left, right) =>
    String(left.createdAt || "").localeCompare(String(right.createdAt || "")));
}
export function shouldFollowMessages({ scrollHeight, scrollTop, clientHeight }, threshold = 96) {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
/** A deliberately small, text-only Markdown subset. No HTML or executable links. */
export function coachBlocks(value) {
  const lines = String(value || "").replaceAll("\r\n", "\n").split("\n"), blocks = [];
  let paragraph = [], list = null, code = null;
  const flush = () => {
    if (paragraph.length) { blocks.push({ type: "paragraph", text: paragraph.join("\n") }); paragraph = []; }
    if (list) { blocks.push(list); list = null; }
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flush();
      if (code !== null) { blocks.push({ type: "code", text: code.join("\n") }); code = null; }
      else code = [];
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) { flush(); blocks.push({ type: "heading", text: heading[1] }); continue; }
    const item = line.match(/^\s*(?:([-*])|\d+[.)])\s+(.+)$/);
    if (item) {
      if (paragraph.length) flush();
      const ordered = !item[1];
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { type: "list", ordered, items: [] };
      list.items.push(item[2]); continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  if (code !== null) blocks.push({ type: "code", text: code.join("\n") });
  return blocks;
}
