import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { updateRegistration, deleteRegistration } from "./adminController.js";
import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";

const uri = process.env.TEST_MONGO_URI;
function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("member edits persist contacts, clear sparse IDs and respect staff/guest scope", { skip: !uri }, async () => {
  await mongoose.connect(uri);
  const student = new mongoose.Types.ObjectId();
  const guest = new mongoose.Types.ObjectId();
  try {
    await Registration.collection.insertOne({ _id: student, email: student + "@example.invalid", admissionNo: String(student) });
    await StaffGuestRegistration.collection.insertOne({ _id: guest, userType: "guest", email: guest + "@example.invalid", membershipId: String(guest) });
    const request = { params: { id: student }, query: { memberType: "student" }, body: { phoneNumber: "1000000001", whatsappNumber: "1000000002", admissionNo: "" } };
    let res = response();
    await updateRegistration(request, res);
    assert.equal(res.code, 200);
    const saved = await Registration.collection.findOne({ _id: student });
    assert.equal(saved.phone, "1000000001");
    assert.equal(saved.whatsappNumber, "1000000002");
    assert.equal(saved.admissionNo, undefined);

    request.params.id = guest;
    request.query.memberType = "staff";
    for (const action of [updateRegistration, deleteRegistration]) {
      res = response();
      await action(request, res);
      assert.equal(res.code, 404);
    }
    assert.equal((await StaffGuestRegistration.collection.findOne({ _id: guest })).phone, undefined);
    request.query.memberType = "guest";
    request.body = { phone: "2000000001" };
    res = response();
    await updateRegistration(request, res);
    assert.equal(res.code, 200);
    assert.equal((await StaffGuestRegistration.collection.findOne({ _id: guest })).phone, request.body.phone);
  } finally {
    await Promise.all([Registration.collection.deleteOne({ _id: student }), StaffGuestRegistration.collection.deleteOne({ _id: guest })]);
    await mongoose.disconnect();
  }
});
