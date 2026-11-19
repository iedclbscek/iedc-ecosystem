import assert from "node:assert/strict";
import test from "node:test";
import { setPublicNoStore } from "./httpCache.js";

test("publication responses cannot retain another workspace origin in browser or CDN caches", () => {
  const headers = new Map();
  const res = { set: (name, value) => headers.set(name, value) };

  setPublicNoStore(res);

  assert.equal(headers.get("Cache-Control"), "no-store");
  assert.equal(headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(headers.get("Vary"), "Origin");
});
