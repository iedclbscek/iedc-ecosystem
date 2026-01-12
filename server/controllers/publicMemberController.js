import User from "../models/User.js";
import Registration from "../models/Registration.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deriveYearOfJoining({ admissionNo, membershipId }) {
  const admission = String(admissionNo ?? "").trim();
  const memberId = String(membershipId ?? "").trim();

  const admissionYear = admission.match(/^\d{4}/)?.[0];
  if (admissionYear) return admissionYear;

  const memberYear2 = memberId.match(/iedc(\d{2})/i)?.[1];
  if (memberYear2) return `20${memberYear2}`;

  return "";
}

export async function getMemberById(req, res) {
  try {
    const rawId =
      req.params.membershipId ?? req.query.id ?? req.query.membershipId;
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

    const user = await User.findOne({ membershipId: membershipIdRegex })
      .select("membershipId registrationRef")
      .populate(
        "registrationRef",
        "firstName lastName admissionNo department membershipId"
      );

    const registration =
      user?.registrationRef ??
      (await Registration.findOne({ membershipId: membershipIdRegex }).select(
        "firstName lastName admissionNo department membershipId"
      ));

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    const yearOfJoining = deriveYearOfJoining({
      admissionNo: registration.admissionNo,
      membershipId: registration.membershipId ?? membershipId,
    });

    return res.json({
      success: true,
      data: {
        firstName: registration.firstName,
        lastName: registration.lastName,
        admissionNo: registration.admissionNo,
        department: registration.department,
        yearOfJoining,
        membershipId: registration.membershipId ?? membershipId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch member",
      error: error.message,
    });
  }
}
