import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import EmailTemplate from "../models/EmailTemplate.js";
import { studentDepartments, joiningYears } from "../../shared/studentOptions.js";
import Registration from "../models/Registration.js";
import { getActiveMemberAudience, sendBulkEmailTemplate } from "./emailTemplateController.js";

function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const mailer = { role: "admin" };

test("mailer permission and filter validation apply before reading or sending email", async () => {
  for (const action of [getActiveMemberAudience, sendBulkEmailTemplate]) {
    const res = response();
    await action({ user: { role: "club_lead" }, query: { page: "1" } }, res);
    assert.equal(res.code, 403);
  }
  for (const query of [{ department: "" }, { department: ["IT"] }, { yearOfJoining: "all" }, { year: "2026" }, { department: { nested: "IT" } }]) {
    const res = response();
    await getActiveMemberAudience({ user: mailer, query }, res);
    assert.equal(res.code, 400);
  }
  for (const page of ["", "0", "-1", "1.5", "2pages", "100001", "999999999999999999999999", ["1", "2"], { nested: "2" }]) {
    const res = response();
    await getActiveMemberAudience({ user: mailer, query: { page } }, res);
    assert.equal(res.code, 400, JSON.stringify(page));
  }
  for (const body of [
    { sendTo: "all", filters: null },
    { sendTo: "all", filters: [] },
    { sendTo: "all", filters: { department: "  " } },
    { sendTo: "all", department: "IT" },
    { sendTo: "all", filters: { year: "2026" } },
    { sendTo: "all", filters: { page: "2" } },
    { sendTo: "list", filters: { department: "IT" }, recipients: [{ email: "x@example.invalid" }] },
  ]) {
    const res = response();
    await sendBulkEmailTemplate({ user: mailer, body }, res);
    assert.equal(res.code, 400);
  }

  const res = response();
  await sendBulkEmailTemplate({ user: mailer, query: { department: "IT" }, body: { sendTo: "all" } }, res);
  assert.equal(res.code, 400);
});

test("Mongo audience counts match actual envelopes, including intersections and historical values", { skip: !process.env.TEST_MONGO_URI }, async t => {
  // A separate database ensures the no-filter case can never pick up unrelated addresses.
  const database = "iedc_mail_test_" + randomUUID().replaceAll("-", "");
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: database });
  const previousUser = process.env.EMAIL_USER;
  const previousPass = process.env.EMAIL_PASS;
  const deliveries = [];
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async envelope => { deliveries.push(envelope); },
  }));
  process.env.EMAIL_USER = "sender@example.invalid";
  process.env.EMAIL_PASS = "local-test";

  try {
    const template = await EmailTemplate.create({ name: "Mail test", key: "test", html: "Hello {{name}}" });
    const params = { id: String(template._id) };
    await Registration.collection.insertMany([
      { status: "active", department: "Information Technology", yearOfJoining: "2025", email: " a@example.invalid ", firstName: "A" },
      { status: "active", department: " information technology ", yearOfJoining: 2024, email: "b@example.invalid", firstName: "B" },
      { status: "active", department: "Civil Engineering", yearOfJoining: " 2025 ", email: "c@example.invalid", firstName: "C" },
      { status: "active", email: "d@example.invalid", firstName: "D" },
      { status: "active", department: "Hidden department", yearOfJoining: "2000", email: "invalid" },
      { status: "pending", department: "Hidden department", yearOfJoining: "2000", email: "pending@example.invalid" },
      { status: "rejected", department: "Hidden department", yearOfJoining: "2000", email: "rejected@example.invalid" },
    ]);

    const selections = [
      [undefined, ["a", "b", "c", "d"]],
      [{ department: "information technology" }, ["a", "b"]],
      [{ yearOfJoining: "2025" }, ["a", "c"]],
      [{ department: "  INFORMATION TECHNOLOGY  ", yearOfJoining: "2025" }, ["a"]],
      [{ department: "Civil Engineering", yearOfJoining: "2024" }, []],
      [{ department: "Unknown" }, []],
      [{ yearOfJoining: "1900" }, []],
    ];
    for (const [filters, expected] of selections) {
      const preview = response();
      await getActiveMemberAudience({ user: mailer, query: filters || {} }, preview);
      assert.equal(preview.code, 200, JSON.stringify(preview.body));
      assert.deepEqual(preview.body, {
        departments: [...studentDepartments, "Hidden department"].sort(),
        years: joiningYears(["2025", "2024", "2000"]),
        total: expected.length,
      });

      deliveries.length = 0;
      const sent = response();
      await sendBulkEmailTemplate({ user: mailer, params, body: { sendTo: "all", ...(filters && { filters }) } }, sent);
      assert.equal(sent.code, 200, JSON.stringify(sent.body));
      assert.deepEqual(sent.body, { mode: "all", total: expected.length, sent: expected.length, failed: 0, failures: [] });
      const expectedEmails = expected.map(name => name + "@example.invalid");
      assert.deepEqual(deliveries.map(email => email.to).sort(), expectedEmails);
      const identities = response();
      await getActiveMemberAudience({ user: mailer, query: { ...filters, page: "1" } }, identities);
      assert.equal(identities.code, 200);
      assert.equal(identities.body.page, 1);
      assert.equal(identities.body.totalPages, 1);
      assert.equal(identities.body.total, preview.body.total);
      assert.deepEqual(identities.body.members.map(member => member.email), expectedEmails);
      for (const email of deliveries) assert.equal(email.html, "Hello " + email.to[0].toUpperCase());
    }
    deliveries.length = 0;
    const list = response();
    await sendBulkEmailTemplate({ user: mailer, params, body: {
      sendTo: "list", recipients: [{ email: "external@example.invalid", data: { name: "Uploaded" } }, { email: "invalid" }],
    } }, list);
    assert.equal(list.body.sent, 1);
    assert.deepEqual(deliveries.map(({ to, html }) => ({ to, html })), [{ to: "external@example.invalid", html: "Hello Uploaded" }]);

    // Tied names cross the page boundary; insert in reverse order to verify the ID tie-break.
    const rows = Array.from({ length: 12 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      status: "active",
      department: " Geology ",
      yearOfJoining: 2025,
      firstName: i === 0 ? "alice" : "Jordan",
      lastName: "K",
      email: `r${i}@example.invalid`,
      adminNotes: "private",
      phone: "private",
    }));
    await Registration.collection.insertMany([...rows].reverse());
    for (const [page, expected] of [[1, rows.slice(0, 10)], [2, rows.slice(10)], [3, []]]) {
      const paged = response();
      await getActiveMemberAudience({ user: mailer, query: { department: "geology", yearOfJoining: "2025", page: String(page) } }, paged);
      assert.equal(paged.code, 200);
      assert.equal(paged.body.total, 12);
      assert.equal(paged.body.totalPages, 2);
      assert.equal(paged.body.page, page);
      assert.deepEqual(paged.body.members, expected.map(row => ({
        id: String(row._id), email: row.email, firstName: row.firstName, lastName: row.lastName,
        department: "Geology", yearOfJoining: "2025",
      })));
    }
    await Registration.updateMany({ status: "active" }, { $set: { status: "pending" } });
    const noActive = response();
    await getActiveMemberAudience({ user: mailer, query: { page: "1" } }, noActive);
    assert.equal(noActive.body.total, 0);
    assert.deepEqual(noActive.body.members, []);
    for (const department of studentDepartments) assert(noActive.body.departments.includes(department));
    assert(noActive.body.years.includes("2025"));
  } finally {
    if (previousUser === undefined) delete process.env.EMAIL_USER; else process.env.EMAIL_USER = previousUser;
    if (previousPass === undefined) delete process.env.EMAIL_PASS; else process.env.EMAIL_PASS = previousPass;
    try { await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); }
  }
});
