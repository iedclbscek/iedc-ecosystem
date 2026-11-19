import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import User from "../models/User.js";
import { updateUser } from "./teamController.js";

const manager = { role: "execom", permissions: ["users", "events"] };
const admin = { role: "Admin" };

async function edit(target, body, actor = manager) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  await updateUser({ user: actor, params: { id: String(target._id) }, body }, res);
  return res;
}

test("team edits preserve protected grants and unchanged roles", { skip: !process.env.TEST_MONGO_URI }, async t => {
  const database = "iedc_team_test_" + randomUUID().replaceAll("-", "");
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: database });
  try {
    const makeUser = (role, permissions) => User.create({
      membershipId: randomUUID(), password: "unused-test-value", role, permissions, portalAccessEnabled: false,
    });
    const target = await makeUser("Faculty Advisor", ["mailer", "events", "legacy_setting"]);
    const existingLabel = { role: "Custom", customRole: "Faculty Advisor" };
    let res = await edit(target, { ...existingLabel, permissions: ["users", "settings", "club_events_delete"] });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.user.permissions.toSorted(), ["legacy_setting", "mailer", "users"]);
    assert.equal(res.body.user.role, "Faculty Advisor");

    res = await edit(target, { ...existingLabel, websiteProfile: { visible: true } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.user.permissions.toSorted(), ["legacy_setting", "mailer", "users"]);
    res = await edit(target, { permissions: [] });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.user.permissions.toSorted(), ["legacy_setting", "mailer"]);

    for (const customRole of ["Faculty advisor", "Senior Advisor", "Admin", "Club Lead"]) {
      assert.equal((await edit(target, { role: "Custom", customRole })).statusCode, 403);
    }
    assert.equal((await edit(target, { role: "super_admin" })).statusCode, 403);
    assert.equal((await edit(target, { ...existingLabel, permissions: null })).statusCode, 400);
    assert.equal((await User.findById(target._id)).role, "Faculty Advisor");

    // Preserve existing labels when historical and canonical built-in role spellings agree.
    const lead = await makeUser("Club Lead", ["settings", "events"]);
    res = await edit(lead, { role: "Custom", customRole: "Club Lead", permissions: ["users"] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, "Club Lead");
    assert.deepEqual(res.body.user.permissions.toSorted(), ["settings", "users"]);
    res = await edit(lead, { role: "club_lead" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, "Club Lead");
    assert.equal((await edit(lead, { role: "execom" })).statusCode, 403);
    assert.equal((await User.findById(lead._id)).role, "Club Lead");

    const legacy = await makeUser("Execom", ["settings", "events"]);
    res = await edit(legacy, { role: "iedc_execom", permissions: [] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, "Execom");
    assert.deepEqual(res.body.user.permissions, ["settings"]);
    res = await edit(legacy, { role: "Custom", customRole: "Faculty Liaison", permissions: ["mailer"] }, admin);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, "Faculty Liaison");
    assert.deepEqual(res.body.user.permissions, ["mailer"]);

    const oldUser = await User.collection.insertOne({ membershipId: randomUUID(), role: "Editor", password: "unused-test-value" });
    res = await edit({ _id: oldUser.insertedId }, { role: "club_member", permissions: ["events"] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, "Editor");
    assert.deepEqual(res.body.user.permissions, ["events"]);

    const protectedUser = await makeUser("Admin", ["settings"]);
    assert.equal((await edit(protectedUser, { role: "iedc_execom", permissions: [] })).statusCode, 403);

    // Simulate a separate completed grant between reading the target and saving this edit.
    const originalSave = User.prototype.save;
    t.mock.method(User.prototype, "save", async function (...args) {
      await User.collection.updateOne({ _id: this._id }, { $addToSet: { permissions: "makerspace" } });
      return originalSave.apply(this, args);
    });
    res = await edit(target, { ...existingLabel, permissions: ["events"] });
    assert.equal(res.statusCode, 409);
    assert.deepEqual((await User.findById(target._id)).permissions.toSorted(), ["legacy_setting", "mailer", "makerspace"]);
  } finally {
    try { await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); }
  }
});
