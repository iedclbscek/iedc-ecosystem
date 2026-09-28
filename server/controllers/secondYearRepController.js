import Registration from "../models/Registration.js";
import SecondYearRepresentativeApplication from "../models/SecondYearRepresentativeApplication.js";
import SystemSetting from "../models/SystemSetting.js";
import OTP from "../models/OTP.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/mailer.js";
import { clientIp, consumeRateLimit } from "../utils/simpleRateLimit.js";

const OTP_PURPOSE = "second_year_rep";
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MIN_ANSWER_LENGTH = 30;

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const getOtpTokenSecret = () => {
  return process.env.OTP_TOKEN_SECRET || process.env.JWT_SECRET;
};

const buildMemberSnapshot = (registration, profile = {}) => {
  const classValue = typeof profile.class === "string" ? profile.class.trim() : "";
  const phoneValue = typeof profile.phone === "string" ? profile.phone.trim() : "";

  return {
    name: `${registration.firstName || ""} ${registration.lastName || ""}`.trim(),
    admissionNumber: registration.admissionNo || "",
    department: registration.department || "",
    semester: registration.semester || "",
    class: classValue || registration.class || "",
    email: registration.email || "",
    phone: phoneValue || registration.phone || "",
  };
};

const answersAreValid = (answers) => {
  const requiredAnswers = ["motivation", "teamworkInitiative", "representativeIdea"];
  if (!answers || typeof answers !== "object") return false;
  return requiredAnswers.every((key) => {
    const value = answers[key];
    return typeof value === "string" && value.trim().length >= MIN_ANSWER_LENGTH;
  });
};

const findRegistrationByMembershipAndEmail = async (membershipId, email) => {
  const idRegex = new RegExp(`^${escapeRegex(membershipId)}$`, "i");
  const registration = await Registration.findOne({ membershipId: idRegex }).lean();
  if (!registration || normalizeEmail(registration.email) !== email) {
    return null;
  }
  return registration;
};

// Route 0: getApplicationStatus (public)
export const getApplicationStatus = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: "second_year_reps_open" }).lean();
    const isOpen = setting ? Boolean(setting.value) : true;
    res.json({ isOpen });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Route 1: requestVerification
export const requestVerification = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: "second_year_reps_open" }).lean();
    const isOpen = setting ? Boolean(setting.value) : true;
    if (!isOpen) {
      return res.status(403).json({ message: "Applications for Second-Year Representatives are currently closed." });
    }

    const membershipId = String(req.body?.membershipId ?? "").trim();
    const email = normalizeEmail(req.body?.email);

    if (!membershipId || !email) {
      return res.status(400).json({ message: "Membership ID and registered email are required." });
    }

    const registration = await findRegistrationByMembershipAndEmail(membershipId, email);
    if (!registration) {
      return res.status(404).json({ message: "We couldn't find a matching IEDC membership with this ID and email." });
    }

    const ip = clientIp(req);
    const sendLimit = consumeRateLimit(`syrep:otp-send:${ip}:${email}`, {
      max: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!sendLimit.ok) {
      return res.status(429).json({ message: "Too many verification requests. Please try again later." });
    }

    const semester = String(registration.semester ?? "").toUpperCase();
    const isSecondYear = ["S3", "S4", "3", "4"].includes(semester) || registration.yearOfJoining === (new Date().getFullYear() - 1).toString();

    if (!isSecondYear) {
      return res.status(403).json({ message: "This application is only open to Second-Year students." });
    }

    const existingApp = await SecondYearRepresentativeApplication.findOne({ membershipId: registration.membershipId }).lean();
    if (existingApp) {
      return res.status(409).json({
        message: "APPLICATION ALREADY SUBMITTED: An application for this membership has already been received.",
        status: existingApp.status
      });
    }

    const existingOtp = await OTP.findOne({ email, purpose: OTP_PURPOSE });
    if (existingOtp?.createdAt && Date.now() - existingOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait before requesting another verification code." });
    }

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashed = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ email, purpose: OTP_PURPOSE });
    await OTP.create({
      email,
      otp: hashed,
      expiresAt,
      purpose: OTP_PURPOSE,
      membershipId: registration.membershipId,
      attempts: 0,
    });

    const subject = "IEDC Second-Year Representative Application - Verification Code";
    const html = `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>Verification Code</h2>
        <p>Your verification code for the IEDC Second-Year Representative Application is:</p>
        <div style="font-size:24px;font-weight:bold;letter-spacing:4px;margin:20px 0;">${rawOtp}</div>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;

    try {
      await sendMail({ to: email, subject, html });
    } catch (e) {
      console.error("Failed to send OTP email:", e);
      return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
    }

    res.json({ success: true, message: "OTP sent to your registered email." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Route 2: verifyOtp
export const verifyOtp = async (req, res) => {
  try {
    const membershipId = String(req.body?.membershipId ?? "").trim();
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp ?? "").trim();

    if (!membershipId || !email || !otp) {
      return res.status(400).json({ message: "Membership ID, email, and OTP are required." });
    }

    const ip = clientIp(req);
    const verifyLimit = consumeRateLimit(`syrep:otp-verify:${ip}:${email}`, {
      max: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!verifyLimit.ok) {
      return res.status(429).json({ message: "Too many verification attempts. Please try again later." });
    }

    const record = await OTP.findOne({ email, purpose: OTP_PURPOSE });
    if (!record || !record.expiresAt || record.expiresAt.getTime() < Date.now()) {
      await OTP.deleteMany({ email, purpose: OTP_PURPOSE });
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const storedMembership = String(record.membershipId || "").trim();
    const submittedMatchesStored =
      storedMembership &&
      storedMembership.toLowerCase() === membershipId.toLowerCase();

    const incomingHash = hashOtp(otp);
    if (incomingHash !== record.otp || !submittedMatchesStored) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        await OTP.deleteMany({ email, purpose: OTP_PURPOSE });
        return res.status(429).json({ message: "Too many invalid OTP attempts. Request a new code." });
      }
      await record.save();
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    await OTP.deleteMany({ email, purpose: OTP_PURPOSE });

    const registration = await findRegistrationByMembershipAndEmail(membershipId, email);
    if (!registration) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const secret = getOtpTokenSecret();
    if (!secret) throw new Error("OTP_TOKEN_SECRET not configured");

    const otpToken = jwt.sign(
      { email, membershipId: registration.membershipId, scope: "second_year_rep" },
      secret,
      { expiresIn: "1h" }
    );

    res.json({ success: true, otpToken, profile: buildMemberSnapshot(registration) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Route 3: getProfile (optional, if they reload the page and have the token)
export const getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const secret = getOtpTokenSecret();
    const payload = jwt.verify(token, secret);

    if (payload.scope !== "second_year_rep") {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const registration = await Registration.findOne({ membershipId: payload.membershipId }).lean();
    if (!registration) return res.status(404).json({ message: "Member not found" });
    if (payload.email && normalizeEmail(registration.email) !== normalizeEmail(payload.email)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.json({ profile: buildMemberSnapshot(registration) });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Route 4: apply
export const submitApplication = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: "second_year_reps_open" }).lean();
    const isOpen = setting ? Boolean(setting.value) : true;
    if (!isOpen) {
      return res.status(403).json({ message: "Applications for Second-Year Representatives are currently closed." });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const secret = getOtpTokenSecret();
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ message: "Invalid or expired session. Please verify your membership again." });
    }

    if (payload.scope !== "second_year_rep") {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const { profile, answers } = req.body;

    if (!answersAreValid(answers)) {
      return res.status(400).json({ message: "All 3 questions must be answered with at least 30 characters." });
    }

    const registration = await Registration.findOne({ membershipId: payload.membershipId }).lean();
    if (!registration) {
      return res.status(404).json({ message: "Member not found" });
    }
    if (payload.email && normalizeEmail(registration.email) !== normalizeEmail(payload.email)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const existingApp = await SecondYearRepresentativeApplication.findOne({ membershipId: payload.membershipId }).lean();
    if (existingApp) {
      return res.status(409).json({ message: "APPLICATION ALREADY SUBMITTED: An application for this membership has already been received." });
    }

    const application = await SecondYearRepresentativeApplication.create({
      membershipId: payload.membershipId,
      memberSnapshot: buildMemberSnapshot(registration, profile),
      motivation: answers.motivation.trim(),
      teamworkInitiative: answers.teamworkInitiative.trim(),
      representativeIdea: answers.representativeIdea.trim(),
      status: "Applied"
    });

    res.status(201).json({ success: true, message: "Application submitted successfully", applicationId: application._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "An application has already been submitted for this membership." });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
