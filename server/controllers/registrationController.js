import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";
import OTP from "../models/OTP.js";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import EmailTemplate from "../models/EmailTemplate.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import jwt from "jsonwebtoken";

const STAFF_GUEST_ID_REGEX = /^IEDC\d{2}(ST|GT)\d+$/i;

const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
};

const escapeRegExp = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const verifyOtpOrThrow = async ({ email, otp }) => {
  const record = await OTP.findOne({ email });
  if (!record || !record.expiresAt || record.expiresAt.getTime() < Date.now()) {
    await OTP.deleteMany({ email });
    throw new Error("OTP expired or invalid");
  }

  const incomingHash = hashOtp(otp);
  if (incomingHash !== record.otp) {
    throw new Error("OTP expired or invalid");
  }

  await OTP.deleteMany({ email });
};

const getOtpTokenSecret = () => {
  return process.env.OTP_TOKEN_SECRET || process.env.JWT_SECRET;
};

const verifyOtpTokenOrThrow = ({ email, otpToken }) => {
  const secret = getOtpTokenSecret();
  if (!secret) {
    throw new Error("OTP_TOKEN_SECRET (or JWT_SECRET) is not configured");
  }

  const payload = jwt.verify(String(otpToken), secret);
  if (!payload || String(payload.scope || "") !== "makerspace_register") {
    throw new Error("OTP token invalid");
  }

  const tokenEmail = normalizeEmail(payload.email);
  if (!tokenEmail || tokenEmail !== normalizeEmail(email)) {
    throw new Error("OTP token invalid");
  }
};

const getIdParts = (userType) => {
  const normalized = String(userType ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "staff") return { userType: "staff", code: "ST" };
  if (normalized === "guest") return { userType: "guest", code: "GT" };
  return null;
};

const getCurrentYear2 = () => {
  const y = new Date().getFullYear();
  return String(y).slice(-2);
};

const generateNextMembershipId = async ({ userType }) => {
  const parts = getIdParts(userType);
  if (!parts) {
    throw new Error("userType must be 'staff' or 'guest'");
  }

  const year2 = getCurrentYear2();
  const prefix = `IEDC${year2}${parts.code}`;
  const regex = new RegExp(`^${escapeRegExp(prefix)}(\\d{3})$`, "i");

  const [lastStudent, lastStaffGuest] = await Promise.all([
    Registration.findOne({ membershipId: regex })
      .select("membershipId")
      .sort({ membershipId: -1 })
      .lean(),
    StaffGuestRegistration.findOne({ membershipId: regex })
      .select("membershipId")
      .sort({ membershipId: -1 })
      .lean(),
  ]);

  const lastCandidate =
    String(lastStudent?.membershipId ?? "").toUpperCase() >
    String(lastStaffGuest?.membershipId ?? "").toUpperCase()
      ? lastStudent
      : lastStaffGuest;

  const lastNum = Number(
    String(lastCandidate?.membershipId ?? "").match(/(\d{3})$/)?.[1] ?? 0
  );
  const nextNum = lastNum + 1;

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
};

export const verifyMember = async (req, res) => {
  try {
    const rawId = req.query?.id ?? req.query?.membershipId;
    const membershipId = String(rawId ?? "").trim();

    if (!membershipId) {
      return res
        .status(400)
        .json({ success: false, message: "id is required" });
    }

    const membershipIdRegex = new RegExp(
      `^${escapeRegExp(membershipId)}$`,
      "i"
    );

    const [existingStudent, existingStaffGuest] = await Promise.all([
      Registration.findOne({ membershipId: membershipIdRegex })
        .select("membershipId userType")
        .lean(),
      StaffGuestRegistration.findOne({ membershipId: membershipIdRegex })
        .select("membershipId userType")
        .lean(),
    ]);

    const existing = existingStudent || existingStaffGuest;

    if (existing) {
      return res.json({
        success: true,
        isRegistered: true,
        userType: existing.userType ?? "student",
      });
    }

    const staffGuestMatch = membershipId.match(STAFF_GUEST_ID_REGEX);
    if (staffGuestMatch) {
      const code = String(staffGuestMatch[1] ?? "").toUpperCase();
      const userType = code === "ST" ? "staff" : "guest";

      return res.json({
        success: true,
        isRegistered: false,
        userType,
      });
    }

    return res.json({ success: true, isRegistered: false });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify member" });
  }
};

export const registerStaffGuest = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otpToken = String(req.body?.otpToken ?? "").trim();
    const otp = String(req.body?.otp ?? "").trim();
    const userTypeInput = String(req.body?.userType ?? "").trim();

    const firstName = String(req.body?.firstName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();
    const department = String(req.body?.department ?? "").trim();
    const organization = String(req.body?.organization ?? "").trim();

    if (!email || !isValidEmail(email) || (!otpToken && !otp)) {
      return res.status(400).json({
        success: false,
        message: "email and otpToken (or otp) are required",
      });
    }

    const parts = getIdParts(userTypeInput);
    if (!parts) {
      return res.status(400).json({
        success: false,
        message: "userType must be 'staff' or 'guest'",
      });
    }

    const organizationToStore =
      parts.userType === "staff"
        ? "LBS College of Engineering Kasaragod"
        : organization;

    if (parts.userType === "guest" && !organizationToStore) {
      return res.status(400).json({
        success: false,
        message: "organization is required for guest registration",
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "firstName and lastName are required",
      });
    }

    // 1) Re-verify before persisting.
    // Preferred: otpToken (short-lived, signed). Legacy fallback: raw otp.
    try {
      if (otpToken) {
        verifyOtpTokenOrThrow({ email, otpToken });
      } else {
        await verifyOtpOrThrow({ email, otp });
      }
    } catch (e) {
      return res
        .status(400)
        .json({ success: false, message: String(e?.message || "Invalid OTP") });
    }

    // Prevent duplicates by email across both collections.
    const [existingStudent, existingStaffGuest] = await Promise.all([
      Registration.findOne({ email }).select("_id").lean(),
      StaffGuestRegistration.findOne({ email }).select("_id").lean(),
    ]);

    const existing = existingStudent || existingStaffGuest;
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    // 2-4) Generate membershipId + accessCode
    const membershipId = await generateNextMembershipId({
      userType: parts.userType,
    });
    const accessCode = membershipId;

    // 2) Create registration (staff/guest go to a dedicated collection)
    const doc = await StaffGuestRegistration.create({
      firstName,
      lastName,
      email,
      department: department || undefined,
      userType: parts.userType,
      organization: organizationToStore || undefined,
      membershipId,
      accessCode,
    });

    // 5) Send confirmation email
    let subject = "Your IEDC Makerspace Access Granted";
    let html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
        <h2>Welcome to IEDC Makerspace</h2>
        <p>Your registered ID / Access Code is:</p>
        <p style="font-size:20px"><b>${membershipId}</b></p>
        <p>Use this ID to check-in at the Makerspace entrance.</p>
      </div>
    `;

    // Prefer the Email Template Center template if present.
    try {
      const template = await EmailTemplate.findOne({
        key: "makerspace_access_granted",
      });
      if (template?.html) {
        subject = String(template.subject || subject);
        const name = `${firstName} ${lastName}`.trim();
        html = renderTemplate(template.html, {
          email,
          membershipId,
          accessCode,
          userType: parts.userType,
          name: name ? ` ${name}` : "",
          firstName,
          lastName,
          department: department || "",
          organization: organizationToStore || "",
        });
      }
    } catch {
      // ignore template lookup errors
    }

    const mailResult = await sendMail({ to: email, subject, html });

    return res.status(201).json({
      success: true,
      message: "Registration completed",
      membershipId: doc.membershipId,
      accessCode: doc.accessCode,
      userType: doc.userType,
      emailSent: Boolean(mailResult?.sent),
    });
  } catch (error) {
    // Duplicate key (e.g. email already registered)
    if (error?.code === 11000) {
      const dupField = Object.keys(error?.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `Duplicate ${dupField}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register",
    });
  }
};
