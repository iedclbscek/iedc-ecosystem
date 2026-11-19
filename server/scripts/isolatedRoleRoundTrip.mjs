import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Club from "../models/Club.js";
import ClubMembership from "../models/ClubMembership.js";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";

const mongoUri = process.env.MONGO_URI;
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:58463";
const password = process.env.QA_FIXTURE_PASSWORD || "fixture-role-password";
const runTag = `qa-role-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const fixtureIds = [`${runTag}-super`, `${runTag}-execom`, `${runTag}-lead`, `${runTag}-member`];
const clubName = `${runTag}-club`;
const otherClubName = `${runTag}-other-club`;
const iedcTitle = `${runTag}-iedc-event`;
const clubTitle = `${runTag}-club-event`;
const editedClubTitle = `${runTag}-club-event-edited`;

if (!mongoUri || !/^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^/?]*qa(?:\?|$)/i.test(mongoUri)) {
  throw new Error("Refusing to run: MONGO_URI must target an isolated *qa database");
}
const parsedBase = new URL(baseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedBase.hostname)) {
  throw new Error("Refusing to run: QA_BASE_URL must be loopback-only");
}

const jsonRequest = async (path, { method = "GET", cookie, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload, cookie: response.headers.get("set-cookie")?.split(";")[0] };
};

const login = async (membershipId, loginPassword = password) => {
  const result = await jsonRequest("/api/admin/auth/login", {
    method: "POST",
    body: { membershipId, password: loginPassword },
  });
  assert.equal(result.status, 200, `login failed for ${membershipId}: ${JSON.stringify(result.payload)}`);
  assert.ok(result.cookie, `login did not set a cookie for ${membershipId}`);
  return result.cookie;
};

await mongoose.connect(mongoUri);
try {
const passwordHash = await bcrypt.hash(password, 10);

const [superadmin, execom, lead, member] = await User.create([
  { name: "QA Superadmin", email: `${fixtureIds[0]}@example.test`, membershipId: fixtureIds[0], password: passwordHash, role: "super_admin", permissions: [], portalAccessEnabled: true },
  { name: "QA Execom", email: `${fixtureIds[1]}@example.test`, membershipId: fixtureIds[1], password: passwordHash, role: "iedc_execom", permissions: ["events"], portalAccessEnabled: true },
  { name: "QA Club Lead", email: `${fixtureIds[2]}@example.test`, membershipId: fixtureIds[2], password: passwordHash, role: "club_lead", permissions: [], portalAccessEnabled: true },
  { name: "QA Club Member", email: `${fixtureIds[3]}@example.test`, membershipId: fixtureIds[3], password: passwordHash, role: "club_member", permissions: [], portalAccessEnabled: true },
]);
const registration = await Registration.create({
  firstName: "QA", lastName: "Member", email: `${runTag}-registration@example.test`, phone: "0000000000",
  referralCode: "QA", department: "Computer Science and Engineering", yearOfJoining: "2026", semester: "1",
  motivation: "Isolated authorization fixture", membershipId: fixtureIds[3], status: "active",
});
const club = await Club.create({
  name: clubName, description: "Isolated fixture", managerUsers: [lead._id], memberUsers: [lead._id, member._id], memberRegistrations: [registration._id],
});
const otherClub = await Club.create({ name: otherClubName, memberUsers: [member._id] });
await ClubMembership.create([
  { userId: lead._id, clubId: club._id, role: "lead", permissions: [], status: "active" },
  { userId: member._id, clubId: club._id, role: "member", permissions: [], status: "active" },
]);
await mongoose.disconnect();

const adminCookie = await login(fixtureIds[0]);
const execomCookie = await login(fixtureIds[1]);
const leadCookie = await login(fixtureIds[2]);
const memberCookie = await login(fixtureIds[3]);

const [adminMe, execomMe, leadMe, memberMe] = await Promise.all([
  jsonRequest("/api/admin/auth/me", { cookie: adminCookie }),
  jsonRequest("/api/admin/auth/me", { cookie: execomCookie }),
  jsonRequest("/api/admin/auth/me", { cookie: leadCookie }),
  jsonRequest("/api/admin/auth/me", { cookie: memberCookie }),
]);
assert.equal(adminMe.payload.portalRole, "super_admin");
assert.equal(execomMe.payload.portalRole, "iedc_execom");
assert.equal(execomMe.payload.canUseIedc, true);
assert.equal(leadMe.payload.workspaces[0].access.managePermissions, true);
assert.equal(memberMe.payload.workspaces[0].access.edit, false);

const iedcCreated = await jsonRequest("/api/admin/events", {
  method: "POST", cookie: execomCookie,
  body: { title: iedcTitle, scope: "iedc", status: "published", visibility: "public", startAt: new Date(Date.now() + 86400000).toISOString() },
});
assert.equal(iedcCreated.status, 201, JSON.stringify(iedcCreated.payload));

const clubCreated = await jsonRequest(`/api/admin/clubs/${club._id}/events`, {
  method: "POST", cookie: leadCookie,
  body: { title: clubTitle, status: "draft", visibility: "public", startAt: new Date(Date.now() + 172800000).toISOString() },
});
assert.equal(clubCreated.status, 201, JSON.stringify(clubCreated.payload));
const clubEventId = clubCreated.payload.event._id;

const grantEdit = await jsonRequest(`/api/admin/clubs/${club._id}/portal-members/${member._id}`, {
  method: "PATCH", cookie: leadCookie,
  body: { portalAccessEnabled: true, permissions: ["club_events_edit"] },
});
assert.equal(grantEdit.status, 200, JSON.stringify(grantEdit.payload));

const edited = await jsonRequest(`/api/admin/clubs/${club._id}/events/${clubEventId}`, {
  method: "PATCH", cookie: memberCookie, body: { title: editedClubTitle },
});
assert.equal(edited.status, 200, JSON.stringify(edited.payload));
const publishDenied = await jsonRequest(`/api/admin/clubs/${club._id}/events/${clubEventId}`, {
  method: "PATCH", cookie: memberCookie, body: { status: "published" },
});
assert.equal(publishDenied.status, 403);

const grantPublish = await jsonRequest(`/api/admin/clubs/${club._id}/portal-members/${member._id}`, {
  method: "PATCH", cookie: leadCookie,
  body: { portalAccessEnabled: true, permissions: ["club_events_edit", "club_events_publish"] },
});
assert.equal(grantPublish.status, 200, JSON.stringify(grantPublish.payload));
const published = await jsonRequest(`/api/admin/clubs/${club._id}/events/${clubEventId}`, {
  method: "PATCH", cookie: memberCookie, body: { status: "published", visibility: "public" },
});
assert.equal(published.status, 200, JSON.stringify(published.payload));

const publicEvents = await jsonRequest("/api/events?limit=100");
assert.equal(publicEvents.status, 200);
const publicTitles = publicEvents.payload.events.map((event) => event.title);
assert.ok(publicTitles.includes(iedcTitle));
assert.ok(publicTitles.includes(editedClubTitle));
const otherAccess = (await jsonRequest("/api/admin/auth/me", { cookie: memberCookie })).payload.workspaces
  .find((workspace) => workspace.id === String(otherClub._id)).access;
assert.equal(otherAccess.view, true);
assert.equal(otherAccess.publish, false);

const permissionUrl = `/api/admin/clubs/${club._id}/portal-members/${member._id}`;
const eventUrl = `/api/admin/clubs/${club._id}/events/${clubEventId}`;
assert.equal((await jsonRequest(permissionUrl, {
  method: "PATCH", cookie: leadCookie, body: { permissions: ["club_events_publish"] },
})).status, 200);
assert.equal((await jsonRequest(eventUrl, {
  method: "PATCH", cookie: memberCookie, body: { status: "draft" },
})).status, 200);
assert.equal((await jsonRequest(`/api/events/${clubEventId}`)).status, 404);
assert.equal((await jsonRequest(permissionUrl, {
  method: "PATCH", cookie: leadCookie, body: { permissions: [] },
})).status, 200);
assert.equal((await jsonRequest(eventUrl, {
  method: "PATCH", cookie: memberCookie, body: { status: "published" },
})).status, 403);

const execomClubDenied = await jsonRequest(`/api/admin/clubs/${club._id}/events`, { cookie: execomCookie });
assert.equal(execomClubDenied.status, 403);
const adminClubAllowed = await jsonRequest(`/api/admin/clubs/${club._id}/events`, { cookie: adminCookie });
assert.equal(adminClubAllowed.status, 200);

const revoked = await jsonRequest(`/api/admin/clubs/${club._id}/portal-members/${member._id}`, {
  method: "PATCH", cookie: leadCookie,
  body: { portalAccessEnabled: false, permissions: ["club_events_edit", "club_events_publish"] },
});
assert.equal(revoked.status, 200, JSON.stringify(revoked.payload));
const liveSessionRevoked = await jsonRequest(`/api/admin/clubs/${club._id}/events`, { cookie: memberCookie });
assert.equal(liveSessionRevoked.status, 403);

console.log(JSON.stringify({
  roles: [adminMe.payload.portalRole, execomMe.payload.portalRole, leadMe.payload.portalRole, memberMe.payload.portalRole],
  leadGrant: grantPublish.payload.user.clubPermissions,
  memberEdit: edited.payload.event.title,
  publishDeniedBeforeGrant: publishDenied.status,
  publicVisibility: publicTitles.filter((title) => title.startsWith(runTag)),
  execomClubScope: execomClubDenied.status,
  superadminClubScope: adminClubAllowed.status,
  liveSessionAfterRevoke: liveSessionRevoked.status,
}, null, 2));
} finally {
  if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  const [fixtureUsers, fixtureClubs] = await Promise.all([
    User.find({ membershipId: { $in: fixtureIds } }).select("_id").lean(),
    Club.find({ name: { $in: [clubName, otherClubName] } }).select("_id").lean(),
  ]);
  await Promise.all([
    Event.deleteMany({ title: { $in: [iedcTitle, clubTitle, editedClubTitle] } }),
    ClubMembership.deleteMany({
      $or: [
        { userId: { $in: fixtureUsers.map((user) => user._id) } },
        { clubId: { $in: fixtureClubs.map((club) => club._id) } },
      ],
    }),
    Registration.deleteMany({ email: `${runTag}-registration@example.test` }),
  ]);
  await Club.deleteMany({ name: { $in: [clubName, otherClubName] } });
  await User.deleteMany({ membershipId: { $in: fixtureIds } });
  await mongoose.disconnect();
}
