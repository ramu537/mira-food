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
