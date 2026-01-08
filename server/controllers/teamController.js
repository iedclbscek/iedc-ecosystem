import Registration from "../models/Registration.js";
import User from "../models/User.js";
import EmailTemplate from "../models/EmailTemplate.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";

const getAdminPortalUrl = () => {
  const isProd =
    String(process.env.NODE_ENV || "")
      .trim()
      .toLowerCase() === "production";
  const raw = String(process.env.ADMIN_PORTAL_URL || "").trim();

  // Sensible defaults: local dev uses Vite; production uses the deployed admin portal.
  let url =
    raw || (isProd ? "https://admin.iedclbscek.in" : "http://localhost:5173");

  // If the value is host-only, add a scheme.
  if (!/^https?:\/\//i.test(url)) {
    url = `${isProd ? "https" : "http"}://${url}`;
  }

  // Avoid mixed content and unreachable http-only hosts in production.
  if (isProd && url.startsWith("http://")) {
    url = `https://${url.slice("http://".length)}`;
  }

  return url.replace(/\/$/, "");
};

export const searchStudents = async (req, res) => {
  try {
    const query = String(req.query.query ?? "").trim();

    if (!query) {
      return res.json({ students: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const students = await Registration.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { membershipId: regex },
        { email: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

export const promoteToTeam = async (req, res) => {
  const { registrationId, role, customRole, permissions } = req.body;

  if (!registrationId) {
    return res.status(400).json({ message: "registrationId is required" });
  }

  const roleInput = String(role ?? "").trim();
  const normalizedRole = roleInput.toLowerCase();

  const allowed = ["admin", "execom", "editor", "custom"]; // API accepts case-insensitive
  if (!allowed.includes(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const finalRole =
    normalizedRole === "custom" ? String(customRole ?? "").trim() : roleInput;
  if (normalizedRole === "custom" && !finalRole) {
    return res
      .status(400)
      .json({ message: "customRole is required when role is Custom" });
  }

  const finalPermissions = Array.isArray(permissions)
    ? permissions.map((p) => String(p).trim()).filter(Boolean)
    : [];

  try {
    const student = await Registration.findById(registrationId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!student.membershipId) {
      return res
        .status(400)
        .json({ message: "Student does not have a membershipId" });
    }

    if (String(student.membershipId).trim().toLowerCase() === "admin") {
      return res
        .status(400)
        .json({ message: "membershipId 'admin' is reserved" });
    }

    const existing = await User.findOne({
      $or: [{ membershipId: student.membershipId }, { email: student.email }],
    });

    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Create a temporary password so the account exists, then force a password-setup via emailed link.
    const tempPassword = crypto.randomBytes(24).toString("hex");
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // One-time password setup token (store only hash)
    const passwordSetupToken = crypto.randomBytes(32).toString("hex");
    const passwordSetupTokenHash = crypto
      .createHash("sha256")
      .update(passwordSetupToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const newUser = await User.create({
      name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      email: student.email,
      membershipId: student.membershipId,
      password: tempPasswordHash,
      role: finalRole,
      permissions: finalPermissions,
      registrationRef: student._id,

      passwordSetupTokenHash,
      passwordSetupExpiresAt: expiresAt,
    });

    // Send email with set-password link
    const portalUrl = getAdminPortalUrl();
    const link = `${portalUrl}/set-password?uid=${newUser._id}&token=${passwordSetupToken}`;

    let subject = "Reset Your Password";
    let html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
        <h2>Reset Your Password</h2>
        <p>Use the link below to set your password:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 1 hour.</p>
      </div>
    `;

    try {
      const template = await EmailTemplate.findOne({ key: "password_reset" });
      if (template?.html) {
        subject = template.subject || subject;
        html = renderTemplate(template.html, { link });
      }
    } catch {
      // ignore template lookup errors
    }

    let emailSent = false;
    try {
      const result = await sendMail({ to: student.email, subject, html });
      emailSent = Boolean(result?.sent);
    } catch {
      emailSent = false;
    }

    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        membershipId: newUser.membershipId,
        role: newUser.role,
        permissions: newUser.permissions,
        registrationRef: newUser.registrationRef,
        createdAt: newUser.createdAt,
      },
      passwordSetupEmailSent: emailSent,
    });
  } catch (error) {
    res.status(500).json({ message: "Promotion failed", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { role, customRole, permissions } = req.body;

  const roleInput = String(role ?? "").trim();
  const normalizedRole = roleInput.toLowerCase();

  const allowed = ["admin", "execom", "editor", "custom"]; // API accepts case-insensitive
  if (!allowed.includes(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const finalRole =
    normalizedRole === "custom" ? String(customRole ?? "").trim() : roleInput;
  if (normalizedRole === "custom" && !finalRole) {
    return res
      .status(400)
      .json({ message: "customRole is required when role is Custom" });
  }

  const finalPermissions = Array.isArray(permissions)
    ? permissions.map((p) => String(p).trim()).filter(Boolean)
    : [];

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.membershipId).trim().toLowerCase() === "admin") {
      return res
        .status(400)
        .json({ message: "Cannot edit reserved admin user" });
    }

    user.role = finalRole;
    user.permissions = finalPermissions;

    await user.save();

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
        registrationRef: user.registrationRef,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.membershipId).trim().toLowerCase() === "admin") {
      return res
        .status(400)
        .json({ message: "Cannot delete reserved admin user" });
    }

    await User.deleteOne({ _id: userId });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};
