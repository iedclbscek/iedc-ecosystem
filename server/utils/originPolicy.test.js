import test from "node:test";
import assert from "node:assert/strict";
import { createOriginPolicy } from "./originPolicy.js";

test("credentialed CORS trusts the deployed sites and individually configured previews", () => {
  const allow = createOriginPolicy({ NODE_ENV: "production", ALLOWED_ORIGINS: "https://approved-portal.vercel.app" });
  for (const origin of [undefined, "https://admin.iedclbscek.in", "https://iedclbscek.in", "https://approved-portal.vercel.app"]) {
    assert.equal(allow(origin), true);
  }
  for (const origin of ["https://other.vercel.app", "https://other.iedclbscek.in", "http://admin.iedclbscek.in", "http://localhost:5173", "null"]) {
    assert.equal(allow(origin), false);
  }
  assert.equal(createOriginPolicy({})("http://127.0.0.1:5173"), true);
});
