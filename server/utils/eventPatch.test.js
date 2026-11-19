import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeOptionalString,
  resolveOptionalRegistrationLink,
} from "./eventPatch.js";

test("omitted event fields remain undefined in partial updates", () => {
  assert.equal(normalizeOptionalString(undefined), undefined);
  assert.equal(resolveOptionalRegistrationLink({}), undefined);
});

test("explicit empty event fields remain clearable", () => {
  assert.equal(normalizeOptionalString(null), "");
  assert.equal(resolveOptionalRegistrationLink({ registrationLink: "  " }), "");
});
