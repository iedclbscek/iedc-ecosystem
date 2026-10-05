import assert from "node:assert/strict";
import test from "node:test";
import Application from "../models/SecondYearRepresentativeApplication.js";
import * as controller from "../controllers/adminSecondYearRepController.js";

const user = { id: "507f1f77bcf86cd799439011", role: "Execom", permissions: ["secondYearReps"] };
const request = (extra = {}) => ({ user, query: {}, params: { id: user.id }, body: {}, ...extra });
const response = () => ({
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(key, value) { this.headers[key] = value; return this; },
  send(body) { this.body = body; return this; },
});

test("every second-year admin handler requires its permission", async () => {
  for (const handler of Object.values(controller)) {
    const res = response();
    await handler(request({ user: { role: "Execom", permissions: ["firstYearReps"] } }), res);
    assert.equal(res.statusCode, 403);
  }
});

test("list rejects malformed queries before querying the database", async (t) => {
  const find = t.mock.method(Application, "find", () => { throw new Error("Unexpected query"); });
  const queries = [
    { page: "-1" }, { page: "1.5" }, { page: "0" }, { page: "1oops" },
    { limit: "-20" }, { limit: "0" }, { limit: "101" },
    { page: String(Number.MAX_SAFE_INTEGER), limit: "20" },
    { department: { $ne: "CSE" } }, { status: ["Applied", "Selected"] },
    { search: { $regex: ".*" } }, { sort: { $natural: 1 } },
    { sort: "unsupported" }, { status: "Unknown" },
  ];
  for (const query of queries) {
    const res = response();
    await controller.getApplications(request({ query }), res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
  assert.equal(find.mock.callCount(), 0);
});

test("list keeps search literal, paginates, and returns consistent global stats", async (t) => {
  let capturedQuery;
  const query = {
    select() { return this; },
    sort(value) { assert.deepEqual(value, { createdAt: -1 }); return this; },
    skip(value) { assert.equal(value, 20); return this; },
    limit(value) { assert.equal(value, 20); return this; },
    async lean() { return []; },
  };
  t.mock.method(Application, "find", value => { capturedQuery = value; return query; });
  t.mock.method(Application, "countDocuments", async value => { assert.equal(value, capturedQuery); return 2; });
  t.mock.method(Application, "aggregate", async () => [
    { _id: "Applied", count: 2 }, { _id: "Selected", count: 5 },
  ]);
  const res = response();
  await controller.getApplications(request({ query: {
    page: "2", search: "[a]+.*", status: "Applied", department: "CSE", sort: "-submittedAt",
  } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedQuery["memberSnapshot.department"], "CSE");
  assert.equal(capturedQuery.status, "Applied");
  assert.equal(capturedQuery.$or[0]["memberSnapshot.name"].test("[a]+.*"), true);
  assert.equal(capturedQuery.$or[0]["memberSnapshot.name"].test("aaaa"), false);
  assert.equal(res.body.page, 2);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.stats.total, 7);
  assert.equal(res.body.stats.applied, 2);
  assert.equal(res.body.stats.selected, 5);
});

test("updates reject empty requests and invalid status or remarks", async (t) => {
  const find = t.mock.method(Application, "findById", () => { throw new Error("Unexpected query"); });
  for (const body of [{}, null, { status: "Unknown" }, { status: null }, { status: 0 }, { remarks: {} }, { remarks: null }]) {
    const res = response();
    await controller.updateApplication(request({ body }), res);
    assert.equal(res.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(find.mock.callCount(), 0);
});

test("notes save and clear while status is Applied, with review attribution", async (t) => {
  let saved = 0;
  const application = { status: "Applied", async save() { saved++; } };
  t.mock.method(Application, "findById", async () => application);
  for (const remarks of ["Reviewer notes", ""]) {
    const res = response();
    await controller.updateApplication(request({ body: { status: "Applied", remarks } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(application.status, "Applied");
    assert.equal(application.review.remarks, remarks);
    assert.equal(application.review.reviewedBy, user.id);
    assert.ok(application.review.reviewedAt instanceof Date);
  }
  assert.equal(saved, 2);
});

test("malformed application IDs return a client error for detail, update, and delete", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const handler of [controller.getApplicationDetail, controller.updateApplication, controller.deleteApplication]) {
    const res = response();
    await handler(request({ params: { id: "invalid" }, body: { status: "Reviewed" } }), res);
    assert.equal(res.statusCode, 400);
  }
});

test("CSV quotes every applicant field and neutralizes spreadsheet formulas", async (t) => {
  const query = {
    select() { return this; }, sort() { return this; },
    async lean() { return [{ membershipId: "=1+1", memberSnapshot: {
      name: 'Doe, "Jane"', admissionNumber: "+123", department: "@CSE",
      semester: "S3", class: 'A,"B"', email: "jane@example.com", phone: "-123",
    }, status: "Applied", createdAt: new Date("2026-10-05T00:00:00Z") }]; },
  };
  t.mock.method(Application, "find", () => query);
  const res = response();
  await controller.exportApplications(request(), res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.endsWith('"Doe, ""Jane""","\'=1+1","\'+123","\'@CSE","S3","A,""B""","jane@example.com","\'-123","Applied","2026-10-05T00:00:00.000Z"'));
  assert.equal(res.headers["Content-Type"], "text/csv");
});
