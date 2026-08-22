import Registration from "../models/Registration.js";
import FirstYearRepresentativeApplication from "../models/FirstYearRepresentativeApplication.js";
import OTP from "../models/OTP.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/mailer.js";

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const getOtpTokenSecret = () => {
  return process.env.OTP_TOKEN_SECRET || process.env.JWT_SECRET;
};

// Route 1: requestVerification
export const requestVerification = async (req, res) => {
  try {
    const membershipId = String(req.body?.membershipId ?? "").trim();
    const email = normalizeEmail(req.body?.email);

    if (!membershipId || !email) {
      return res.status(400).json({ message: "Membership ID and registered email are required." });
    }

    // Lookup registration by membershipId and email
    const idRegex = new RegExp(`^${escapeRegex(membershipId)}$`, "i");
    const registration = await Registration.findOne({ membershipId: idRegex }).lean();

    if (!registration || normalizeEmail(registration.email) !== email) {
      return res.status(404).json({ message: "We couldn't find a matching IEDC membership with this ID and email." });
    }

    // Check first-year eligibility. We assume first-year students are those with semester "S1", "S2" or yearOfJoining == current year.
    // We will just strictly check if they are "student". A strict semester check can be configured based on your academic calendar.
    const semester = String(registration.semester ?? "").toUpperCase();
    const isFirstYear = ["S1", "S2", "1", "2"].includes(semester) || registration.yearOfJoining === new Date().getFullYear().toString();
    
    // As per requirement: "The backend must enforce it"
    if (!isFirstYear) {
      return res.status(403).json({ message: "This application is only open to first-year students." });
    }

    // Check duplicate application
    const existingApp = await FirstYearRepresentativeApplication.findOne({ membershipId: registration.membershipId }).lean();
    if (existingApp) {
      return res.status(409).json({ 
        message: "APPLICATION ALREADY SUBMITTED: An application for this membership has already been received.",
        status: existingApp.status
      });
    }

    // Send OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashed = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.deleteMany({ email });
    await OTP.create({
      email,
      otp: hashed,
      expiresAt,
    });

    const subject = "IEDC First-Year Representative Application - Verification Code";
    const html = `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>Verification Code</h2>
        <p>Your verification code for the IEDC First-Year Representative Application is:</p>
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

    const record = await OTP.findOne({ email });
    if (!record || !record.expiresAt || record.expiresAt.getTime() < Date.now()) {
      await OTP.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const incomingHash = hashOtp(otp);
    if (incomingHash !== record.otp) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    await OTP.deleteMany({ email });

    // Lookup profile
    const idRegex = new RegExp(`^${escapeRegex(membershipId)}$`, "i");
    const registration = await Registration.findOne({ membershipId: idRegex }).lean();

    if (!registration) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const secret = getOtpTokenSecret();
    if (!secret) throw new Error("OTP_TOKEN_SECRET not configured");

    const otpToken = jwt.sign(
      { email, membershipId: registration.membershipId, scope: "first_year_rep" },
      secret,
      { expiresIn: "1h" }
    );

    const profile = {
      name: `${registration.firstName || ""} ${registration.lastName || ""}`.trim(),
      admissionNumber: registration.admissionNo || "",
      department: registration.department || "",
      semester: registration.semester || "",
      class: registration.class || "", // class might not exist, but let's include it
      email: registration.email || "",
      phone: registration.phone || ""
    };

    res.json({ success: true, otpToken, profile });
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

    if (payload.scope !== "first_year_rep") {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const registration = await Registration.findOne({ membershipId: payload.membershipId }).lean();
    if (!registration) return res.status(404).json({ message: "Member not found" });

    const profile = {
      name: `${registration.firstName || ""} ${registration.lastName || ""}`.trim(),
      admissionNumber: registration.admissionNo || "",
      department: registration.department || "",
      semester: registration.semester || "",
      class: registration.class || "",
      email: registration.email || "",
      phone: registration.phone || ""
    };

    res.json({ profile });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Route 4: apply
export const submitApplication = async (req, res) => {
  try {
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

    if (payload.scope !== "first_year_rep") {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const { profile, answers } = req.body;

    if (!profile || !answers || !answers.motivation || !answers.teamworkInitiative || !answers.representativeIdea) {
      return res.status(400).json({ message: "All 3 questions must be answered." });
    }

    // Final duplicate check
    const existingApp = await FirstYearRepresentativeApplication.findOne({ membershipId: payload.membershipId }).lean();
    if (existingApp) {
      return res.status(409).json({ message: "APPLICATION ALREADY SUBMITTED: An application for this membership has already been received." });
    }

    const application = await FirstYearRepresentativeApplication.create({
      membershipId: payload.membershipId,
      memberSnapshot: {
        name: profile.name,
        admissionNumber: profile.admissionNumber,
        department: profile.department,
        semester: profile.semester,
        class: profile.class,
        email: profile.email,
        phone: profile.phone
      },
      motivation: answers.motivation,
      teamworkInitiative: answers.teamworkInitiative,
      representativeIdea: answers.representativeIdea,
      status: "Applied"
    });

    res.status(201).json({ success: true, message: "Application submitted successfully", applicationId: application._id });
  } catch (err) {
    // Mongo duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ message: "An application has already been submitted for this membership." });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
