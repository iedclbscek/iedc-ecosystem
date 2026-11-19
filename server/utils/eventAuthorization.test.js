import test from "node:test";
import assert from "node:assert/strict";

import { buildAuthorizedEventFilter } from "./eventAuthorization.js";

test("rejects a requested club outside the caller's authorized clubs", () => {
  assert.deepEqual(
    buildAuthorizedEventFilter({
      clubIds: ["club-a"],
      requestedClubId: "club-b",
      canUseIedc: false,
    }),
    { allowed: false, filter: null },
  );
});

test("keeps an authorized requested club as an exact constraint", () => {
  assert.deepEqual(
    buildAuthorizedEventFilter({
      clubIds: ["club-a", "club-b"],
      requestedClubId: "club-b",
      canUseIedc: true,
    }),
    { allowed: true, filter: { club: "club-b" } },
  );
});

test("allows IEDC-only callers to list organization events", () => {
  assert.deepEqual(
    buildAuthorizedEventFilter({ clubIds: [], canUseIedc: true }),
    {
      allowed: true,
      filter: {
        $or: [
          { scope: "iedc" },
          { club: null },
          { club: { $exists: false } },
        ],
      },
    },
  );
});

test("combines authorized club and IEDC scopes without widening club access", () => {
  assert.deepEqual(
    buildAuthorizedEventFilter({ clubIds: ["club-a"], canUseIedc: true }),
    {
      allowed: true,
      filter: {
        $or: [
          { club: { $in: ["club-a"] } },
          { scope: "iedc" },
          { club: null },
          { club: { $exists: false } },
        ],
      },
    },
  );
});
