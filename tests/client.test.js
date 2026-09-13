import assert from "node:assert/strict";
import test from "node:test";
import { configureAccessTokenProvider } from "../src/api/client.js";

test("configureAccessTokenProvider accepts function or null", () => {
  assert.doesNotThrow(() => {
    configureAccessTokenProvider(() => "token-123");
  });

  assert.doesNotThrow(() => {
    configureAccessTokenProvider(null);
  });

  assert.throws(() => {
    configureAccessTokenProvider("invalid-provider");
  }, {
    name: "TypeError",
    message: "The access token provider must be a function or null.",
  });
});
