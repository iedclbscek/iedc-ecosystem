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

const normalizeDepartment = (value) => {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();

  const map = {
    CSE: "Computer Science and Engineering",
    CSBS: "Computer Science and Business Systems",
    "CSE (AI & DS)": "Computer Science and Engineering(AI & Data Science)",
    EEE: "Electrical and Electronics Engineering",
    ECE: "Electronics and Communication Engineering",
    IT: "Information Technology",
    ME: "Mechanical Engineering",
    CE: "Civil Engineering",
  };

  if (map[raw]) return map[raw];
  if (map[upper]) return map[upper];

  return raw;
};

const normalizeSemester = (value) => String(value ?? "").trim();

const normalizeString = (value) => String(value ?? "").trim();

const normalizeUrlOrEmpty = (value) => {
  const v = normalizeString(value);
  return v || "";
};

export const createStudentRegistration = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otpToken = String(req.body?.otpToken ?? "").trim();
    const otp = String(req.body?.otp ?? "").trim();

    if (!email || !isValidEmail(email) || (!otpToken && !otp)) {
      return res.status(400).json({
        success: false,
        message: "email and otpToken (or otp) are required",
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
      Registration.findOne({ email }).select("_id membershipId").lean(),
      StaffGuestRegistration.findOne({ email })
        .select("_id membershipId")
        .lean(),
    ]);

    const existing = existingStudent || existingStaffGuest;
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
        existing: true,
        membershipId: existing?.membershipId || undefined,
      });
    }

    const firstName = normalizeString(req.body?.firstName);
    const lastName = normalizeString(req.body?.lastName);
    const phone = normalizeString(req.body?.phone);

    const department = normalizeDepartment(req.body?.department);
    const yearOfJoining = normalizeString(req.body?.yearOfJoining);
    const semester = normalizeSemester(req.body?.semester);
    const referralCode = normalizeString(req.body?.referralCode);
    const admissionNo = normalizeString(req.body?.admissionNo);

    const isLateralEntry = Boolean(req.body?.isLateralEntry);

    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests.map((i) => normalizeString(i)).filter(Boolean)
      : [];

    const nonTechInterests = normalizeString(req.body?.nonTechInterests);
    const experience = normalizeString(req.body?.experience);
    const motivation = normalizeString(req.body?.motivation);

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName and phone are required",
      });
    }

    if (
      !department ||
      !yearOfJoining ||
      !semester ||
      !referralCode ||
      !motivation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "department, yearOfJoining, semester, referralCode and motivation are required",
      });
    }

    const doc = await Registration.create({
      firstName,
      lastName,
      email,
      phone,
      admissionNo: admissionNo || undefined,
      referralCode,
      department,
      yearOfJoining,
      semester,
      isLateralEntry,
      interests,
      nonTechInterests: nonTechInterests || undefined,
      experience: experience || undefined,
      motivation,
      linkedin: normalizeUrlOrEmpty(req.body?.linkedin) || undefined,
      github: normalizeUrlOrEmpty(req.body?.github) || undefined,
      portfolio: normalizeUrlOrEmpty(req.body?.portfolio) || undefined,
      profilePhoto: req.body?.profilePhoto ?? null,
      idPhoto: req.body?.idPhoto ?? null,
      userType: "student",
      status: "pending",
      submittedAt: new Date(),
    });

    // Send confirmation email (best-effort; do not fail the registration if mail fails).
    try {
      const memberName = `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
      const membershipId = String(doc.membershipId || "").trim();

      let subject = "Your IEDC Membership ID";
      let html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 10px 0;">Registration successful</h2>
          <p style="margin:0 0 12px 0;">Hi ${memberName || "there"},</p>
          <p style="margin:0 0 16px 0;">Your IEDC membership registration has been submitted successfully.</p>
          <div style="margin:14px 0 18px 0;padding:14px 12px;border:1px solid #e7e9f2;border-radius:12px;background:#f6f8ff;">
            <div style="font-size:12px;color:#667;letter-spacing:.02em;text-transform:uppercase;">Membership ID</div>
            <div style="font-size:22px;font-weight:800;letter-spacing:.08em;color:#111;">${membershipId || ""}</div>
          </div>
          <p style="margin:0;">Keep this ID for future reference.</p>
        </div>
      `;

      // Prefer a template if present.
      try {
        const template = await EmailTemplate.findOne({
          key: "student_registration_confirmation",
        });
        if (template?.html) {
          subject = String(template.subject || subject);
          html = renderTemplate(template.html, {
            name: memberName,
            email,
            membershipId,
          });
        }
      } catch {
        // ignore template lookup errors
      }

      await sendMail({ to: email, subject, html });
    } catch {
      // ignore mail errors
    }

    return res.status(201).json({
      success: true,
      message: "Registration submitted",
      registrationId: doc._id,
      membershipId: doc.membershipId,
      accessCode: doc.accessCode,
      status: doc.status,
    });
  } catch (error) {
    const isProd = process.env.NODE_ENV === "production";
    if (error?.code === 11000) {
      const dupField = Object.keys(error?.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `Duplicate ${dupField}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: isProd
        ? "Failed to submit registration"
        : `Failed to submit registration: ${String(error?.message || error)}`,
    });
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
    String(lastCandidate?.membershipId ?? "").match(/(\d{3})$/)?.[1] ?? 0,
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
      "i",
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
