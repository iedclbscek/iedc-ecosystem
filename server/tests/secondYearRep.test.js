import assert from "node:assert/strict";
import { beforeEach, afterEach, mock, test } from "node:test";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Registration from "../models/Registration.js";
import Application from "../models/SecondYearRepresentativeApplication.js";
import OTP from "../models/SecondYearRepOTP.js";
import LegacyOTP from "../models/OTP.js";
import SystemSetting from "../models/SystemSetting.js";
import { requestVerification, verifyOtp, submitApplication } from "../controllers/secondYearRepController.js";
import { consumeRateLimit } from "../utils/simpleRateLimit.js";

// DB methods and mail transport are stubbed; this never connects to MongoDB or SMTP.
const secret = "local-second-year-regression-secret";
const member = {
  membershipId: "IEDC25CS001", email: "member@example.test", semester: "3rd Semester",
  yearOfJoining: "2025", firstName: "Test", lastName: "Member", admissionNo: "ADM001",
  department: "Computer Science and Engineering", phone: "1234567890", userType: "student",
};
const code = "123456";
const hash = crypto.createHash("sha256").update(code).digest("hex");
const challenge = () => ({
  _id: "challenge-id", email: member.email, membershipId: member.membershipId,
  otp: hash, attempts: 0, expiresAt: new Date(Date.now() + 600000),
});
let nextIp = 0;
const request = (body = {}, ip = `test-ip-${++nextIp}`) => ({ body, ip, headers: {} });
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const verificationBody = () => ({ membershipId: member.membershipId, email: member.email, otp: code });
const applicationRequest = (body) => ({
  ...request(body), headers: { authorization: `Bearer ${jwt.sign({
    membershipId: member.membershipId, email: member.email, scope: "second_year_rep",
  }, secret)}` },
});
const answers = { motivation: "a".repeat(30), teamworkInitiative: "b".repeat(30), representativeIdea: "c".repeat(30) };

beforeEach(() => {
  process.env.OTP_TOKEN_SECRET = secret;
  process.env.EMAIL_USER = "local-test";
  process.env.EMAIL_PASS = "local-test";
  mock.method(SystemSetting, "findOne", () => ({ lean: async () => ({ value: true }) }));
  mock.method(Registration, "findOne", () => ({ lean: async () => ({ ...member }) }));
  mock.method(Application, "findOne", () => ({ lean: async () => null }));
  mock.method(nodemailer, "createTransport", () => ({ sendMail: async () => {} }));
});
afterEach(() => mock.restoreAll());

test("second-year codes use a separate collection with unique email and expiry indexes", () => {
  assert.notEqual(OTP.collection.name, LegacyOTP.collection.name);
  assert.ok(OTP.schema.indexes().some(([fields, options]) => fields.email === 1 && options.unique));
  assert.ok(OTP.schema.indexes().some(([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0));
});

test("all stored second-year semester formats pass; joining year cannot override another semester", async () => {
  let email;
  mock.method(OTP, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.email, email);
    assert.ok(filter.requestedAt.$lte instanceof Date);
    assert.ok(Date.now() - filter.requestedAt.$lte.getTime() >= 60000);
    assert.equal(update.$set.membershipId, member.membershipId);
    assert.equal(update.$set.attempts, 0);
    assert.deepEqual(options, { upsert: true, new: true });
    return { _id: "issued" };
  });
  for (const semester of ["3rd Semester", "4th Semester", " S3 ", "S4", "3", "4", "S5", "1st Semester"]) {
    const res = response();
    // Distinct emails avoid exhausting the independent per-member send limit in this format check.
    email = `format-${nextIp}@example.test`;
    Registration.findOne.mock.mockImplementation(() => ({ lean: async () => ({
      ...member, email, semester, yearOfJoining: String(new Date().getFullYear() - 1),
    }) }));
    await requestVerification(request({ membershipId: member.membershipId, email }), res);
    assert.equal(res.statusCode, ["S5", "1st Semester"].includes(semester) ? 403 : 200, semester);
  }
});

test("malformed identity/code input is rejected before OTP lookup or rate allocation", async () => {
  const lookup = mock.method(OTP, "findOne", async () => { throw new Error("Unexpected OTP lookup"); });
  const ip = `malformed-${++nextIp}`;
  for (let i = 0; i < 110; i++) {
    const res = response();
    await verifyOtp(request({ ...verificationBody(), otp: { $ne: "" } }, ip), res);
    assert.equal(res.statusCode, 400);
  }
  const res = response();
  lookup.mock.mockImplementation(async () => null);
  await verifyOtp(request(verificationBody(), ip), res);
  assert.equal(res.statusCode, 400);
  assert.equal(lookup.mock.callCount(), 1);
  await requestVerification(request({ membershipId: [member.membershipId], email: member.email }), response());
  assert.equal(Registration.findOne.mock.callCount(), 0);
});

test("rotating email does not evade the per-IP verification limit", async () => {
  const lookup = mock.method(OTP, "findOne", async () => null);
  const ip = `rotating-${++nextIp}`;
  for (let i = 0; i <= 100; i++) {
    const res = response();
    await verifyOtp(request({ ...verificationBody(), email: `rotation-${i}@example.test` }, ip), res);
    assert.equal(res.statusCode, i === 100 ? 429 : 400);
  }
  assert.equal(lookup.mock.callCount(), 100);
});

test("mail delivery failure removes only the just-issued code and reports failure", async () => {
  mock.method(OTP, "findOneAndUpdate", async () => ({ _id: "unsent" }));
  const cleanup = mock.method(OTP, "deleteOne", async (filter) => {
    assert.equal(filter._id, "unsent");
    assert.match(filter.otp, /^[a-f0-9]{64}$/);
  });
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const res = response();
  await requestVerification(request(verificationBody()), res);
  assert.equal(res.statusCode, 500);
  assert.equal(cleanup.mock.callCount(), 1);
  assert.equal(res.body.success, undefined);
});

test("a concurrent resend losing the unique-email cooldown upsert returns 429", async () => {
  mock.method(OTP, "findOneAndUpdate", async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); });
  const res = response();
  await requestVerification(request(verificationBody()), res);
  assert.equal(res.statusCode, 429);
  assert.equal(nodemailer.createTransport.mock.callCount(), 0);
});

test("invalid-code attempts and cleanup cannot modify a replacement OTP", async () => {
  const record = challenge();
  mock.method(OTP, "findOne", async () => record);
  mock.method(OTP, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter._id, record._id);
    assert.equal(filter.otp, hash);
    assert.deepEqual(filter.attempts, { $lt: 5 });
    assert.ok(filter.expiresAt.$gt instanceof Date);
    assert.deepEqual(update, { $inc: { attempts: 1 } });
    return { ...record, attempts: 5 };
  });
  const cleanup = mock.method(OTP, "deleteOne", async (filter) => {
    assert.deepEqual(filter, { _id: record._id, otp: hash, attempts: { $gte: 5 } });
  });
  const res = response();
  await verifyOtp(request({ ...verificationBody(), otp: "999999" }), res);
  assert.equal(res.statusCode, 429);
  assert.equal(cleanup.mock.callCount(), 1);
});

test("concurrent valid verification consumes once and rechecks expiry atomically", async () => {
  mock.method(OTP, "findOne", async () => challenge());
  let consumed = false;
  mock.method(OTP, "findOneAndDelete", async (filter) => {
    assert.equal(filter.otp, hash);
    assert.ok(filter.expiresAt.$gt instanceof Date);
    assert.deepEqual(filter.attempts, { $lt: 5 });
    if (consumed) return null;
    consumed = true;
    return challenge();
  });
  const cleanup = mock.method(OTP, "deleteOne", async () => { throw new Error("Must not delete a replacement"); });
  const responses = [response(), response()];
  await Promise.all(responses.map((res) => verifyOtp(request(verificationBody()), res)));
  assert.deepEqual(responses.map((res) => res.statusCode).sort(), [200, 429]);
  assert.equal(cleanup.mock.callCount(), 0);
  const success = responses.find((res) => res.statusCode === 200);
  assert.equal(jwt.verify(success.body.otpToken, secret).scope, "second_year_rep");
});

test("submission enforces current eligibility and reports missing admission data", async () => {
  const create = mock.method(Application, "create", async () => ({ _id: "application" }));
  for (const [changes, expected] of [[{ semester: "S5" }, 403], [{ admissionNo: undefined }, 400], [{}, 201]]) {
    Registration.findOne.mock.mockImplementation(() => ({ lean: async () => ({ ...member, ...changes }) }));
    const res = response();
    await submitApplication(applicationRequest({ answers, profile: { phone: "9876543210", class: "A" } }), res);
    assert.equal(res.statusCode, expected);
  }
  assert.equal(create.mock.callCount(), 1);
  assert.equal(create.mock.calls[0].arguments[0].memberSnapshot.phone, "9876543210");
});

test("submission rejects short, oversized, and nonstring answers before persistence", async () => {
  const create = mock.method(Application, "create", async () => { throw new Error("Must not persist invalid answers"); });
  for (const motivation of ["a".repeat(29), "a".repeat(1501), { text: "a".repeat(30) }]) {
    const res = response();
    await submitApplication(applicationRequest({ answers: { ...answers, motivation } }), res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(create.mock.callCount(), 0);
});

test("rate-limit capacity does not lock out every previously unseen client", () => {
  for (let i = 0; i < 1001; i++) {
    assert.equal(consumeRateLimit(`capacity-${i}`, { max: 1, windowMs: 600000 }).ok, true);
  }
  assert.equal(consumeRateLimit("capacity-1000", { max: 1, windowMs: 600000 }).ok, false);
});
