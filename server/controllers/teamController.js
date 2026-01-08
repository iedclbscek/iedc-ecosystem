import Registration from "../models/Registration.js";
import User from "../models/User.js";
import EmailTemplate from "../models/EmailTemplate.js";
import Club from "../models/Club.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import { hasPermission } from "../middleware/requireAuth.js";

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const limitPermissionsToActor = (requestedPermissions, actorPermissions) => {
  const requested = Array.isArray(requestedPermissions)
    ? requestedPermissions.map((p) => normalize(p)).filter(Boolean)
    : [];
  const allowed = Array.isArray(actorPermissions)
    ? actorPermissions.map((p) => normalize(p)).filter(Boolean)
    : [];

  const allowedSet = new Set(allowed);
  return Array.from(new Set(requested.filter((p) => allowedSet.has(p))));
};

const isClubManager = (club, userId) => {
  const id = String(userId);
  const managers = Array.isArray(club?.managerUsers) ? club.managerUsers : [];
  return managers.some((u) => String(u) === id);
};

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

const buildPasswordSetupEmail = async ({ link }) => {
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

  return { subject, html };
};

const generatePasswordSetupToken = () => {
  const passwordSetupToken = crypto.randomBytes(32).toString("hex");
  const passwordSetupTokenHash = crypto
    .createHash("sha256")
    .update(passwordSetupToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { passwordSetupToken, passwordSetupTokenHash, expiresAt };
};

const sendPasswordSetupEmail = async ({ to, userId, token }) => {
  const portalUrl = getAdminPortalUrl();
  const link = `${portalUrl}/set-password?uid=${userId}&token=${token}`;
  const { subject, html } = await buildPasswordSetupEmail({ link });

  try {
    const result = await sendMail({ to, subject, html });
    return Boolean(result?.sent);
  } catch {
    return false;
  }
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
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await User.find({})
      .select("-password")
      .sort({ "websiteProfile.order": 1, createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

export const promoteToTeam = async (req, res) => {
  const {
    registrationId,
    role,
    customRole,
    permissions,
    portalAccessEnabled,
    websiteProfile,
  } = req.body;

  if (!hasPermission(req.user, "users")) {
    return res.status(403).json({ message: "Forbidden" });
  }

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

  const nextWebsiteProfile = {
    visible: Boolean(websiteProfile?.visible),
    order: Number.isFinite(Number(websiteProfile?.order))
      ? Number(websiteProfile.order)
      : 0,
    roleTitle: String(websiteProfile?.roleTitle ?? "").trim() || undefined,
    group: String(websiteProfile?.group ?? "").trim() || undefined,
  };

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

    // Create a temporary password so the account exists.
    const tempPassword = crypto.randomBytes(24).toString("hex");
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // By default, execom does not get portal access unless explicitly enabled.
    const nextPortalAccessEnabled =
      portalAccessEnabled !== undefined
        ? Boolean(portalAccessEnabled)
        : normalizedRole === "execom"
        ? false
        : true;

    const tokenBundle = nextPortalAccessEnabled
      ? generatePasswordSetupToken()
      : null;

    const newUser = await User.create({
      name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      email: student.email,
      membershipId: student.membershipId,
      password: tempPasswordHash,
      role: finalRole,
      permissions: finalPermissions,
      portalAccessEnabled: nextPortalAccessEnabled,
      websiteProfile: nextWebsiteProfile,
      registrationRef: student._id,

      ...(tokenBundle
        ? {
            passwordSetupTokenHash: tokenBundle.passwordSetupTokenHash,
            passwordSetupExpiresAt: tokenBundle.expiresAt,
          }
        : {}),
    });

    const emailSent = tokenBundle
      ? await sendPasswordSetupEmail({
          to: student.email,
          userId: newUser._id,
          token: tokenBundle.passwordSetupToken,
        })
      : false;

    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        membershipId: newUser.membershipId,
        role: newUser.role,
        permissions: newUser.permissions,
        portalAccessEnabled: newUser.portalAccessEnabled,
        websiteProfile: newUser.websiteProfile,
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
  const { role, customRole, permissions, portalAccessEnabled, websiteProfile } =
    req.body;

  if (!hasPermission(req.user, "users")) {
    return res.status(403).json({ message: "Forbidden" });
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

  const patchWebsiteProfile = websiteProfile
    ? {
        ...(websiteProfile.visible !== undefined
          ? { visible: Boolean(websiteProfile.visible) }
          : {}),
        ...(websiteProfile.order !== undefined
          ? {
              order: Number.isFinite(Number(websiteProfile.order))
                ? Number(websiteProfile.order)
                : 0,
            }
          : {}),
        ...(websiteProfile.roleTitle !== undefined
          ? {
              roleTitle: String(websiteProfile.roleTitle).trim() || undefined,
            }
          : {}),
        ...(websiteProfile.group !== undefined
          ? { group: String(websiteProfile.group).trim() || undefined }
          : {}),
      }
    : null;

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

    const wasPortalAccessEnabled = user.portalAccessEnabled !== false;

    if (portalAccessEnabled !== undefined) {
      user.portalAccessEnabled = Boolean(portalAccessEnabled);
    }

    const isPortalAccessEnabled = user.portalAccessEnabled !== false;
    const shouldSendPasswordSetupEmail =
      !wasPortalAccessEnabled && isPortalAccessEnabled;

    if (patchWebsiteProfile) {
      user.websiteProfile = {
        ...(user.websiteProfile?.toObject
          ? user.websiteProfile.toObject()
          : user.websiteProfile || {}),
        ...patchWebsiteProfile,
      };
    }

    let emailSent = false;
    let tokenBundle = null;
    if (shouldSendPasswordSetupEmail) {
      tokenBundle = generatePasswordSetupToken();
      user.passwordSetupTokenHash = tokenBundle.passwordSetupTokenHash;
      user.passwordSetupExpiresAt = tokenBundle.expiresAt;
    }

    // Save updates (and token if generated) before sending email.
    await user.save();

    if (tokenBundle) {
      emailSent = await sendPasswordSetupEmail({
        to: user.email,
        userId: user._id,
        token: tokenBundle.passwordSetupToken,
      });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
        portalAccessEnabled: user.portalAccessEnabled,
        websiteProfile: user.websiteProfile,
        registrationRef: user.registrationRef,
        createdAt: user.createdAt,
      },
      ...(shouldSendPasswordSetupEmail
        ? { passwordSetupEmailSent: emailSent }
        : {}),
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

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

// Club-scoped portal user management (for club leads only)
export const promoteClubPortalMember = async (req, res) => {
  const { clubId } = req.params;
  const { registrationId, portalAccessEnabled, permissions } = req.body;

  if (!clubId) {
    return res.status(400).json({ message: "clubId is required" });
  }
  if (!registrationId) {
    return res.status(400).json({ message: "registrationId is required" });
  }

  try {
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isClubManager(club, req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const student = await Registration.findById(registrationId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!student.membershipId) {
      return res
        .status(400)
        .json({ message: "Student does not have a membershipId" });
    }
    if (normalize(student.membershipId) === "admin") {
      return res
        .status(400)
        .json({ message: "membershipId 'admin' is reserved" });
    }

    // Ensure this registration is part of the club membership list.
    const regId = String(student._id);
    const memberRegs = Array.isArray(club.memberRegistrations)
      ? club.memberRegistrations.map((r) => String(r))
      : [];
    if (!memberRegs.includes(regId)) {
      club.memberRegistrations = [...memberRegs, regId];
    }

    const requestedPerms = limitPermissionsToActor(
      permissions,
      req.user?.permissions
    );
    const nextPortalAccessEnabled =
      portalAccessEnabled !== undefined ? Boolean(portalAccessEnabled) : true;

    let user = await User.findOne({
      $or: [{ membershipId: student.membershipId }, { email: student.email }],
    });

    let passwordSetupEmailSent = false;

    if (!user) {
      const tempPassword = crypto.randomBytes(24).toString("hex");
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

      const tokenBundle = nextPortalAccessEnabled
        ? generatePasswordSetupToken()
        : null;

      user = await User.create({
        name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
        email: student.email,
        membershipId: student.membershipId,
        password: tempPasswordHash,
        role: "Club Member",
        permissions: requestedPerms,
        portalAccessEnabled: nextPortalAccessEnabled,
        websiteProfile: {
          visible: false,
          order: 0,
        },
        registrationRef: student._id,

        ...(tokenBundle
          ? {
              passwordSetupTokenHash: tokenBundle.passwordSetupTokenHash,
              passwordSetupExpiresAt: tokenBundle.expiresAt,
            }
          : {}),
      });

      if (tokenBundle) {
        passwordSetupEmailSent = await sendPasswordSetupEmail({
          to: student.email,
          userId: user._id,
          token: tokenBundle.passwordSetupToken,
        });
      }
    } else {
      // Existing user: update permissions within actor scope.
      user.permissions = requestedPerms;

      const wasPortalAccessEnabled = user.portalAccessEnabled !== false;
      if (portalAccessEnabled !== undefined) {
        user.portalAccessEnabled = Boolean(portalAccessEnabled);
      }
      const isPortalAccessEnabled = user.portalAccessEnabled !== false;
      const shouldSendPasswordSetupEmail =
        !wasPortalAccessEnabled && isPortalAccessEnabled;

      let tokenBundle = null;
      if (shouldSendPasswordSetupEmail) {
        tokenBundle = generatePasswordSetupToken();
        user.passwordSetupTokenHash = tokenBundle.passwordSetupTokenHash;
        user.passwordSetupExpiresAt = tokenBundle.expiresAt;
      }

      await user.save();

      if (tokenBundle) {
        passwordSetupEmailSent = await sendPasswordSetupEmail({
          to: user.email,
          userId: user._id,
          token: tokenBundle.passwordSetupToken,
        });
      }
    }

    // Ensure the portal user is in club.memberUsers
    const memberUsers = Array.isArray(club.memberUsers)
      ? club.memberUsers.map((u) => String(u))
      : [];
    const uid = String(user._id);
    if (!memberUsers.includes(uid)) {
      club.memberUsers = [...memberUsers, uid];
    }

    await club.save();

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
        portalAccessEnabled: user.portalAccessEnabled,
        registrationRef: user.registrationRef,
        createdAt: user.createdAt,
      },
      passwordSetupEmailSent,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to add club portal member",
        error: error.message,
      });
  }
};

export const updateClubPortalMember = async (req, res) => {
  const { clubId, userId } = req.params;
  const { portalAccessEnabled, permissions } = req.body;

  if (!clubId || !userId) {
    return res.status(400).json({ message: "clubId and userId are required" });
  }

  try {
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isClubManager(club, req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const uid = String(userId);
    const memberUsers = Array.isArray(club.memberUsers)
      ? club.memberUsers.map((u) => String(u))
      : [];
    if (!memberUsers.includes(uid)) {
      return res
        .status(403)
        .json({ message: "User is not a member of this club" });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (normalize(user.membershipId) === "admin") {
      return res
        .status(400)
        .json({ message: "Cannot edit reserved admin user" });
    }

    if (permissions !== undefined) {
      user.permissions = limitPermissionsToActor(
        permissions,
        req.user?.permissions
      );
    }

    const wasPortalAccessEnabled = user.portalAccessEnabled !== false;
    if (portalAccessEnabled !== undefined) {
      user.portalAccessEnabled = Boolean(portalAccessEnabled);
    }
    const isPortalAccessEnabled = user.portalAccessEnabled !== false;
    const shouldSendPasswordSetupEmail =
      !wasPortalAccessEnabled && isPortalAccessEnabled;

    let tokenBundle = null;
    if (shouldSendPasswordSetupEmail) {
      tokenBundle = generatePasswordSetupToken();
      user.passwordSetupTokenHash = tokenBundle.passwordSetupTokenHash;
      user.passwordSetupExpiresAt = tokenBundle.expiresAt;
    }

    await user.save();

    let passwordSetupEmailSent = false;
    if (tokenBundle) {
      passwordSetupEmailSent = await sendPasswordSetupEmail({
        to: user.email,
        userId: user._id,
        token: tokenBundle.passwordSetupToken,
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
        portalAccessEnabled: user.portalAccessEnabled,
        registrationRef: user.registrationRef,
        createdAt: user.createdAt,
      },
      ...(shouldSendPasswordSetupEmail ? { passwordSetupEmailSent } : {}),
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to update club portal member",
        error: error.message,
      });
  }
};
