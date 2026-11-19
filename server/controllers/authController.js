import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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
import ClubMembership from "../models/ClubMembership.js";

import {
  canUseIedcWorkspace,
  isSuperAdmin,
  getClubEventAccess,
  normalizePortalRole,
} from "../utils/authorization.js";

const COOKIE_NAME = "token";

const getAuthorizationContext = async (user) => {
  const memberships = await ClubMembership.find({ userId: user._id }).select("clubId permissions role status").lean();
  const grants = new Map(memberships.map(m => [String(m.clubId), m]));
  const membershipClubIds = memberships.map((membership) => membership.clubId);
  const clubs = await Club.find(
    isSuperAdmin(user)
      ? {}
      : {
          $or: [
            { _id: { $in: membershipClubIds } },
            { memberUsers: user._id },
            { managerUsers: user._id },
            { editorUsers: user._id },
          ],
        },
  ).select("name memberUsers managerUsers editorUsers").sort({ name: 1 }).lean();
  const authUser = {
    id: user._id,
    role: user.role,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  };
  const resolved = clubs.map(club => ({
    id: club._id,
    name: club.name,
    access: getClubEventAccess({ club, user: authUser, membership: grants.get(String(club._id)) }),
  }));
  const portalRole = normalizePortalRole(user.role);
  return {
    portalRole,
    isClubLead: clubs.some((club, index) => resolved[index].access.view &&
      club.managerUsers?.some((id) => String(id) === String(user._id))),
    canUseIedc: canUseIedcWorkspace(user),
    workspaces: resolved.filter((workspace) => workspace.access.view),
  };
};

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  // Only use COOKIE_DOMAIN in production to avoid issues with localhost
  const domain =
    isProd && process.env.COOKIE_DOMAIN
      ? String(process.env.COOKIE_DOMAIN).trim() || undefined
      : undefined;

  // Safari/iOS has strict cross-origin cookie policies.
  // If admin portal and API share the same parent domain (e.g., admin.domain.com + api.domain.com),
  // use SameSite=lax with a domain cookie for better iOS compatibility.
  // If they're completely different domains, SameSite=none is required but may be blocked by Safari ITP.
  const useLaxForSameDomain = domain && isProd;

  return {
    httpOnly: true,
    secure: isProd, // Required for SameSite=none
    sameSite: useLaxForSameDomain ? "lax" : isProd ? "none" : "lax",
    // Only set domain when explicitly configured to avoid cookie rejection on preview/staging hosts.
    domain,
    path: "/",
  };

};

export const login = async (req, res) => {
  const { membershipId, password } = req.body || {};

  if (typeof membershipId !== "string" || membershipId.length > 256 || !membershipId.trim() ||
      typeof password !== "string" || !password || password.length > 1024) {
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
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid membership ID or password" });

    if (user.portalAccessEnabled === false) {
      return res
        .status(403)
        .json({ message: "Access to the admin portal is disabled" });
    }


    const authorization = await getAuthorizationContext(user);

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
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

        ...authorization,
      });
  } catch (error) {
    res.status(500).json({ message: "Unable to sign in" });
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

    const authorization = await getAuthorizationContext(user);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      membershipId: user.membershipId,
      role: user.role,
      permissions: user.permissions,
      portalAccessEnabled: user.portalAccessEnabled,
      websiteProfile: user.websiteProfile,

      ...authorization,
    });
  } catch (error) {
    res.status(401).json({ message: "Not authenticated" });
  }
};

export const setPassword = async (req, res) => {
  const { userId, token, password } = req.body || {};

  if (!mongoose.isObjectIdOrHexString(userId) || typeof token !== "string" || !token ||
      typeof password !== "string" || !password || password.length > 1024) {
    return res
      .status(400)
      .json({ message: "userId, token and password are required" });
  }

  try {
    const match = {
      _id: userId,
      passwordSetupTokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      passwordSetupExpiresAt: { $gt: new Date() },
    };
    if (!await User.exists(match)) return res.status(400).json({ message: "Password setup link is invalid or expired" });
    const hash = await bcrypt.hash(password, 10);
    const saved = await User.updateOne({ ...match, passwordSetupExpiresAt: { $gt: new Date() } }, {
      $set: { password: hash },
      $unset: { passwordSetupTokenHash: "", passwordSetupExpiresAt: "" },
    });
    if (!saved.modifiedCount) return res.status(400).json({ message: "Password setup link is invalid or expired" });

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
    { expiresIn: "10m" },
  );
};

export const sendOTP = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose ?? req.body?.flow ?? "")
      .trim()
      .toLowerCase();

    const email = await resolveEmailFromEmailOrMembershipId({
      email: req.body?.email,
      membershipId: req.body?.membershipId ?? req.body?.id,
    });

    if (!email) {
      const hasMembership = Boolean(
        String(req.body?.membershipId ?? req.body?.id ?? "").trim(),
      );
      return res.status(hasMembership ? 404 : 400).json({
        message: hasMembership
          ? "Member not found for provided membershipId"
          : "Provide a valid email or membershipId",
      });
    }

    // For the membership registration flow, block OTP spam if the email already exists.
    // Important: do NOT block makerspace/member flows that identify via membershipId.
    const hasMembershipId = Boolean(
      String(req.body?.membershipId ?? req.body?.id ?? "").trim(),
    );

    if (!hasMembershipId && purpose === "registration") {
      const [existingStudent, existingStaffGuest] = await Promise.all([
        Registration.findOne({ email }).select("_id").lean(),
        StaffGuestRegistration.findOne({ email }).select("_id").lean(),
      ]);

      if (existingStudent || existingStaffGuest) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }
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
    const otp = String(req.body?.otp ?? "").trim();

    const rawMembershipId = String(
      req.body?.membershipId ?? req.body?.id ?? "",
    ).trim();
    const hasMembershipId = Boolean(rawMembershipId);

    const rawEmail = normalizeEmail(req.body?.email);

    if (!otp) {
      return res
        .status(400)
        .json({ success: false, message: "otp is required" });
    }

    let email = "";
    if (rawEmail) {
      if (!isValidEmail(rawEmail)) {
        return res
          .status(400)
          .json({ success: false, message: "Valid email is required" });
      }
      email = rawEmail;
    } else if (hasMembershipId) {
      email = await resolveEmailFromEmailOrMembershipId({
        membershipId: rawMembershipId,
      });
      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Member not found for provided membershipId",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide a valid email or membershipId",
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
