import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import Club from "../models/Club.js";
import User from "../models/User.js";
import Registration from "../models/Registration.js";
import ClubMembership from "../models/ClubMembership.js";
import { promoteClubPortalMember, updateClubPortalMember } from "./teamController.js";

for (const handler of [promoteClubPortalMember, updateClubPortalMember]) {
  test(`${handler.name} rejects non-boolean access without changing club or account state`, { skip: !process.env.TEST_MONGO_URI }, async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: "club_access_test_" + randomUUID().replaceAll("-", "") });
    try {
      const actor = { id: new mongoose.Types.ObjectId(), role: "club_lead" };
      const user = await User.create({ membershipId: "access-member", email: "access@example.test", password: "unused", role: "club_member" });
      const registration = await Registration.create({ firstName: "Access", lastName: "Member", email: user.email, phone: "0000000000", referralCode: "QA", department: "Computer Science and Engineering", yearOfJoining: "2026", semester: "1", motivation: "Validation fixture", membershipId: user.membershipId, status: "active" });
      const club = await Club.create({ name: "Access validation", managerUsers: [actor.id], memberUsers: [user._id] });
      await ClubMembership.create({ clubId: club._id, userId: user._id, status: "inactive", permissions: ["club_page_edit"] });
      const snapshot = async () => Promise.all([
        Club.findById(club._id).lean(), User.findById(user._id).lean(),
        ClubMembership.findOne({ clubId: club._id, userId: user._id }).lean(),
      ]);
      const call = async portalAccessEnabled => {
        const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
        await handler({ user: actor, params: { clubId: String(club._id), userId: String(user._id) }, body: { registrationId: String(registration._id), portalAccessEnabled } }, res);
        return res;
      };
      for (const value of ["false", "true", 0, 1, null]) {
        const before = await snapshot();
        const response = await call(value);
        assert.equal(response.statusCode, 400, `accepted ${JSON.stringify(value)}`);
        assert.deepEqual(await snapshot(), before);
      }
      for (const [value, expectedStatus] of [[true, "active"], [false, "inactive"]]) {
        const response = await call(value);
        assert.equal(response.statusCode, handler === promoteClubPortalMember ? 201 : 200, JSON.stringify(response.body));
        assert.equal(response.body.user.clubStatus, expectedStatus);
        assert.equal((await ClubMembership.findOne({ clubId: club._id, userId: user._id })).status, expectedStatus);
      }
      const omitted = await call(undefined);
      assert.equal(omitted.statusCode, handler === promoteClubPortalMember ? 201 : 200);
      assert.equal(omitted.body.user.clubStatus, handler === promoteClubPortalMember ? "active" : "inactive");
    } finally {
      try { await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); }
    }
  });
}
