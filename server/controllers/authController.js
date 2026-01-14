import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import crypto from "crypto";
import Club from "../models/Club.js";
import OTP from "../models/OTP.js";
import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";
import { sendMail } from "../utils/mailer.js";
import EmailTemplate from "../models/EmailTemplate.js";
import { renderTemplate } from "../utils/templateRenderer.js";

const COOKIE_NAME = "token";

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    path: "/",
  };
};

export const login = async (req, res) => {
  const { membershipId, password } = req.body;

  if (!membershipId || !password) {
    return res
      .status(400)
      .json({ message: "membershipId and password are required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  try {
    const normalizedMembershipId = String(membershipId).trim().toLowerCase();
    const user = await User.findOne({ membershipId: normalizedMembershipId });
    if (!user)
      return res.status(401).json({ message: "Invalid Membership ID" });

    if (user.portalAccessEnabled === false) {
      return res
        .status(403)
        .json({ message: "Access to the admin portal is disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    let isClubLead = false;
    try {
      const leadCount = await Club.countDocuments({ managerUsers: user._id });
      isClubLead = leadCount > 0;
    } catch {
      isClubLead = false;
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res
      .cookie(COOKIE_NAME, token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
        portalAccessEnabled: user.portalAccessEnabled,
        websiteProfile: user.websiteProfile,
        isClubLead,
      });
  } catch (error) {
    res.status(500).json({ message: "Login Error", error: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    if (user.portalAccessEnabled === false) {
      return res
        .status(403)
        .json({ message: "Access to the admin portal is disabled" });
    }

    let isClubLead = false;
    try {
      const leadCount = await Club.countDocuments({ managerUsers: user._id });
      isClubLead = leadCount > 0;
    } catch {
      isClubLead = false;
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      membershipId: user.membershipId,
      role: user.role,
      permissions: user.permissions,
      portalAccessEnabled: user.portalAccessEnabled,
      websiteProfile: user.websiteProfile,
      isClubLead,
    });
  } catch (error) {
    res.status(401).json({ message: "Not authenticated" });
  }
};

export const setPassword = async (req, res) => {
  const { userId, token, password } = req.body;

  if (!userId || !token || !password) {
    return res
      .status(400)
      .json({ message: "userId, token and password are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.passwordSetupTokenHash || !user.passwordSetupExpiresAt) {
      return res
        .status(400)
        .json({ message: "Password setup link is invalid" });
    }

    if (user.passwordSetupExpiresAt.getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "Password setup link has expired" });
    }

    const incomingHash = crypto
      .createHash("sha256")
      .update(String(token))
      .digest("hex");
    if (incomingHash !== user.passwordSetupTokenHash) {
      return res
        .status(400)
        .json({ message: "Password setup link is invalid" });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    user.password = hashed;
    user.passwordSetupTokenHash = undefined;
    user.passwordSetupExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password set successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to set password", error: error.message });
  }
};

const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isValidEmail = (email) => {
  // Minimal sanity check; do not try to fully validate RFC 5322.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveEmailFromEmailOrMembershipId = async ({ email, membershipId }) => {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail && isValidEmail(normalizedEmail)) {
    return normalizedEmail;
  }

  const rawMembershipId = String(membershipId ?? "").trim();
  if (!rawMembershipId) return "";

  const idRegex = new RegExp(`^${escapeRegex(rawMembershipId)}$`, "i");

  // Prefer registration records for makerspace flows.
  const student = await Registration.findOne({ membershipId: idRegex })
    .select("email")
    .lean();
  const studentEmail = normalizeEmail(student?.email);
  if (studentEmail && isValidEmail(studentEmail)) return studentEmail;

  const staffGuest = await StaffGuestRegistration.findOne({
    membershipId: idRegex,
  })
    .select("email")
    .lean();
  const staffGuestEmail = normalizeEmail(staffGuest?.email);
  if (staffGuestEmail && isValidEmail(staffGuestEmail)) return staffGuestEmail;

  const user = await User.findOne({ membershipId: idRegex })
    .select("email")
    .lean();
  const userEmail = normalizeEmail(user?.email);
  if (userEmail && isValidEmail(userEmail)) return userEmail;

  return "";
};

const generateNumericOtp = () => {
  // 6-digit numeric OTP
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const getOtpTokenSecret = () => {
  return process.env.OTP_TOKEN_SECRET || process.env.JWT_SECRET;
};

const signOtpToken = ({ email }) => {
  const secret = getOtpTokenSecret();
  if (!secret) {
    throw new Error("OTP_TOKEN_SECRET (or JWT_SECRET) is not configured");
  }

  return jwt.sign(
    {
      email,
      scope: "makerspace_register",
    },
    secret,
    { expiresIn: "10m" }
  );
};

export const sendOTP = async (req, res) => {
  try {
    const email = await resolveEmailFromEmailOrMembershipId({
      email: req.body?.email,
      membershipId: req.body?.membershipId ?? req.body?.id,
    });

    if (!email) {
      const hasMembership = Boolean(
        String(req.body?.membershipId ?? req.body?.id ?? "").trim()
      );
      return res.status(hasMembership ? 404 : 400).json({
        message: hasMembership
          ? "Member not found for provided membershipId"
          : "Provide a valid email or membershipId",
      });
    }

    const otpPlain = generateNumericOtp();
    const otpHashed = hashOtp(otpPlain);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp: otpHashed, expiresAt });

    let subject = "Your Makerspace OTP";
    let html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
        <h2>Makerspace Verification Code</h2>
        <p>Your OTP is:</p>
        <p style="font-size:22px;letter-spacing:2px"><b>${otpPlain}</b></p>
        <p>This OTP expires in 5 minutes.</p>
        <p>If you didn’t request this, you can ignore this email.</p>
      </div>
    `;

    // Prefer the Email Template Center template if present.
    try {
      const template = await EmailTemplate.findOne({ key: "makerspace_otp" });
      if (template?.html) {
        subject = String(template.subject || subject);
        html = renderTemplate(template.html, {
          otp: otpPlain,
          expiresMinutes: 5,
          email,
        });
      }
    } catch {
      // ignore template lookup errors
    }

    const mailResult = await sendMail({ to: email, subject, html });

    // Never return the OTP to the client.
    return res.json({ success: true, sent: Boolean(mailResult?.sent) });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const email = await resolveEmailFromEmailOrMembershipId({
      email: req.body?.email,
      membershipId: req.body?.membershipId ?? req.body?.id,
    });
    const otp = String(req.body?.otp ?? "").trim();

    if (!email || !isValidEmail(email) || !otp) {
      return res.status(400).json({
        success: false,
        message: "Provide email or membershipId, and otp",
      });
    }

    const record = await OTP.findOne({ email });
    if (
      !record ||
      !record.expiresAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      await OTP.deleteMany({ email });
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or invalid" });
    }

    const incomingHash = hashOtp(otp);
    if (incomingHash !== record.otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or invalid" });
    }

    // One-time use.
    await OTP.deleteMany({ email });

    const otpToken = signOtpToken({ email });
    return res.json({ success: true, message: "OTP verified", otpToken });
  } catch (error) {
    const message = String(error?.message || "").includes("OTP_TOKEN_SECRET")
      ? "OTP token signing is not configured"
      : "Failed to verify OTP";
    return res.status(500).json({ success: false, message });
  }
};
