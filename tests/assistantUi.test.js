import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme } from "../src/lib/theme.js";
import { coachBlocks, mergeCoachTurns, shouldFollowMessages } from "../src/lib/coachChat.js";

test("appearance respects explicit choice and resolves system mode", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
test("polling and pagination retain older turns and update existing IDs", () => {
  const previous = [{ id: "a", createdAt: "2026-10-01", status: "COMPLETED" }, { id: "b", createdAt: "2026-10-02", status: "PENDING" }];
  const incoming = [{ id: "b", createdAt: "2026-10-02", status: "COMPLETED" }];
  assert.deepEqual(mergeCoachTurns(previous, incoming).map(turn => [turn.id, turn.status]), [["a", "COMPLETED"], ["b", "COMPLETED"]]);
});
test("reading an older answer does not force a scroll to the bottom", () => {
  assert.equal(shouldFollowMessages({ scrollHeight: 1000, scrollTop: 50, clientHeight: 300 }), false);
  assert.equal(shouldFollowMessages({ scrollHeight: 1000, scrollTop: 650, clientHeight: 300 }), true);
});
test("assistant formatting preserves model HTML as inert text", () => {
  const blocks = coachBlocks("# Summary\n\n- **One**\n- Two\n\n<script>bad()</script>");
  assert.deepEqual(blocks.map(block => block.type), ["heading", "list", "paragraph"]);
  assert.equal(blocks[2].text, "<script>bad()</script>");
  assert.deepEqual(coachBlocks("```sql\nSELECT 1\n```"), [{ type: "code", text: "SELECT 1" }]);
});
