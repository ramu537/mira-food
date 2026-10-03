import test from "node:test";
import assert from "node:assert/strict";
import { isPendingConversation, recordPath } from "../src/lib/coachChat.js";

test("pending and processing are waiting, completed and failed are not", () => {
  assert.equal(isPendingConversation({ status: "PENDING" }), true);
  assert.equal(isPendingConversation({ status: "PROCESSING" }), true);
  assert.equal(isPendingConversation({ status: "COMPLETED" }), false);
  assert.equal(isPendingConversation({ status: "FAILED" }), false);
});
test("record links refer to actual local records, not arbitrary model URLs", () => {
  assert.equal(recordPath("tasks", { sql: "SELECT id FROM coach_tasks" }, { id: 7 }), "/?task=7");
  assert.equal(recordPath("notes", { sql: "SELECT id FROM coach_notes" }, { id: 9 }), "/?note=9");
  assert.equal(recordPath("diary", { sql: "SELECT * FROM coach_diary_entries" },
    { id: 2, entry_date: "2026-10-03" }), "/entry?date=2026-10-03");
  assert.equal(recordPath("tasks", { sql: "SELECT * FROM coach_tasks" }, { id: "javascript:alert(1)" }), null);
});
test("mixed-table results do not invent a source record association", () => {
  assert.equal(recordPath("tasks", { sql: "SELECT t.id FROM coach_tasks t JOIN coach_habits h ON true" }, { id: 7 }), null);
});
