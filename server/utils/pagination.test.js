import test from "node:test";
import assert from "node:assert/strict";
import { parsePagination, paginationMeta } from "./pagination.js";

test("parsePagination clamps invalid and excessive values", () => {
  assert.deepEqual(parsePagination({ page: "-3", limit: "500" }, { defaultLimit: 20, maxLimit: 100 }), {
    page: 1,
    limit: 100,
    skip: 0,
  });
});

test("paginationMeta keeps empty collections on page one", () => {
  assert.deepEqual(paginationMeta({ page: 4, limit: 20, total: 0 }), {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
});

test("paginationMeta clamps a stale page after deletion", () => {
  assert.deepEqual(paginationMeta({ page: 9, limit: 10, total: 21 }), {
    page: 3,
    limit: 10,
    total: 21,
    totalPages: 3,
  });
});
