import assert from "node:assert/strict";
import test from "node:test";

import { setPublicCache, setPublicRevalidation } from "./httpCache.js";

test("setPublicCache emits browser and shared-cache directives", () => {
  const headers = new Map();
  const res = { set: (name, value) => headers.set(name, value) };

  setPublicCache(res, { browserSeconds: 30, sharedSeconds: 120, staleSeconds: 300 });

  assert.equal(
    headers.get("Cache-Control"),
    "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
  );
});

test("setPublicCache prevents caches from mixing origins", () => {
  const headers = new Map();
  const res = { set: (name, value) => headers.set(name, value) };

  setPublicCache(res);

  assert.equal(headers.get("Vary"), "Origin");
});

test("setPublicRevalidation allows storage but forbids stale publication responses", () => {
  const headers = new Map();
  const res = { set: (name, value) => headers.set(name, value) };

  setPublicRevalidation(res);

  assert.equal(headers.get("Cache-Control"), "public, max-age=0, no-cache, must-revalidate");
  assert.equal(headers.get("Vary"), "Origin");
});
