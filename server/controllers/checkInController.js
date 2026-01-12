import Registration from "../models/Registration.js";
import CheckIn from "../models/CheckIn.js";

const escapeRegExp = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createCheckIn = async (req, res) => {
  try {
    const rawId =
      req.body?.membershipId ?? req.query?.id ?? req.query?.membershipId;
    const membershipId = String(rawId ?? "").trim();

    if (!membershipId) {
      return res
        .status(400)
        .json({ success: false, message: "membershipId is required" });
    }

    const membershipIdRegex = new RegExp(
      `^${escapeRegExp(membershipId)}$`,
      "i"
    );

    const registration = await Registration.findOne({
      membershipId: membershipIdRegex,
    })
      .select("_id membershipId userType")
      .lean();

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // Allow check-in for any registered member (student/staff/guest)
    const record = await CheckIn.create({
      membershipId: registration.membershipId,
      userType: registration.userType ?? "student",
      registrationRef: registration._id,
    });

    return res.status(201).json({
      success: true,
      message: "Checked in",
      checkInId: record._id,
      membershipId: record.membershipId,
      userType: record.userType,
      checkedInAt: record.checkedInAt,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to check in" });
  }
};
