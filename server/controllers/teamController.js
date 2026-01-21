import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";
import User from "../models/User.js";
import EmailTemplate from "../models/EmailTemplate.js";
import Club from "../models/Club.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import { hasPermission } from "../middleware/requireAuth.js";
import WebsiteTeamEntry from "../models/WebsiteTeamEntry.js";

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const normalizeMemberType = (value) => {
  const v = normalize(value);
  if (!v) return "student";
  if (v === "student" || v === "staff" || v === "guest" || v === "all")
    return v;
  return null;
};

const CLUB_PORTAL_ALLOWED_PERMISSIONS = new Set([
  "dashboard",
  "events",
  "users",
]);

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

const limitClubPortalPermissions = (requestedPermissions, actorPermissions) => {
  const withinActor = limitPermissionsToActor(
    requestedPermissions,
    actorPermissions,
  );
  return withinActor.filter((p) => CLUB_PORTAL_ALLOWED_PERMISSIONS.has(p));
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
    const memberType = normalizeMemberType(req.query.memberType);

    if (!memberType) {
      return res
        .status(400)
        .json({
          message: "memberType must be 'student', 'staff', 'guest', or 'all'",
        });
    }

    if (!query) {
      return res.json({ students: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const baseOr = [
      { firstName: regex },
      { lastName: regex },
      { membershipId: regex },
      { email: regex },
    ];

    
    const [fromRegistrations, fromStaffGuests] = await Promise.all([
      memberType === "staff" || memberType === "guest"
        ? []
        : memberType === "all"
          ? Registration.find({ $or: baseOr })
              .sort({ createdAt: -1 })
              .limit(20)
          : Registration.find({ $or: baseOr })
              .sort({ createdAt: -1 })
              .limit(20),
              
      memberType === "student"
        ? []
        : memberType === "all"
          ? StaffGuestRegistration.find({ $or: baseOr })
              .sort({ createdAt: -1 })
              .limit(20)
          : StaffGuestRegistration.find({ userType: memberType, $or: baseOr })
              .sort({ createdAt: -1 })
              .limit(20),
    ]);

    const merged = [...(fromRegistrations || []), ...(fromStaffGuests || [])]
      .map((d) => {
        const obj = typeof d?.toObject === "function" ? d.toObject() : d;
        const inferred = normalize(obj?.userType) || "student";
        return { ...obj, userType: inferred };
      })
      .sort((a, b) => {
        const at = new Date(a?.createdAt || 0).getTime();
        const bt = new Date(b?.createdAt || 0).getTime();
        return bt - at;
      })
      .slice(0, 20);

    res.json({ students: merged });
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

const parseYearSortKey = (year) => {
  // Supports common formats like "2025-26" or "2025-2026".
  const raw = String(year ?? "").trim();
  const m = raw.match(/(\d{4})\D*(\d{2,4})?/);
  if (!m) return { primary: 0, secondary: 0 };
  const start = Number(m[1] || 0);
  const endRaw = m[2] ? String(m[2]) : "";
  const end = endRaw.length === 2 ? Number(`20${endRaw}`) : Number(endRaw || 0);
  return { primary: start, secondary: end };
};

export const listWebsiteTeamYears = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const category = normalize(req.query.category) || "execom";
    const years = await WebsiteTeamEntry.distinct("year", { category });
    years.sort((a, b) => {
      const ka = parseYearSortKey(a);
      const kb = parseYearSortKey(b);
      if (ka.primary !== kb.primary) return kb.primary - ka.primary;
      if (ka.secondary !== kb.secondary) return kb.secondary - ka.secondary;
      return String(b).localeCompare(String(a));
    });

    return res.json({ years });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch years", error: error.message });
  }
};

export const listWebsiteTeamEntries = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const category = normalize(req.query.category) || "execom";
    const year = String(req.query.year ?? "").trim();

    const filter = { category };
    if (year) filter.year = year;

    const entries = await WebsiteTeamEntry.find(filter)
      .populate("userRef", "name email membershipId role portalAccessEnabled")
      .sort({ year: -1, order: 1, createdAt: 1 });

    return res.json({ entries });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch entries", error: error.message });
  }
};

export const createWebsiteTeamEntry = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const category = normalize(req.body?.category) || "execom";
    const year = String(req.body?.year ?? "").trim();
    const userId = String(req.body?.userId ?? "").trim();
    const roleTitle = String(req.body?.roleTitle ?? "").trim() || undefined;
    const visible =
      req.body?.visible !== undefined ? Boolean(req.body.visible) : true;

    if (!year || !userId) {
      return res.status(400).json({ message: "year and userId are required" });
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const last = await WebsiteTeamEntry.findOne({ category, year })
      .sort({ order: -1, createdAt: -1 })
      .select("order")
      .lean();

    const nextOrder = Number.isFinite(Number(last?.order))
      ? Number(last.order) + 1
      : 0;

    const entry = await WebsiteTeamEntry.create({
      category,
      year,
      userRef: user._id,
      roleTitle,
      visible,
      order: nextOrder,
    });

    const populated = await WebsiteTeamEntry.findById(entry._id).populate(
      "userRef",
      "name email membershipId role portalAccessEnabled",
    );

    return res.status(201).json({ entry: populated });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Entry already exists for this year" });
    }
    return res
      .status(500)
      .json({ message: "Failed to create entry", error: error.message });
  }
};

export const updateWebsiteTeamEntry = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "id is required" });

    const patch = {};
    if (req.body?.year !== undefined)
      patch.year = String(req.body.year ?? "").trim();
    if (req.body?.visible !== undefined)
      patch.visible = Boolean(req.body.visible);
    if (req.body?.roleTitle !== undefined) {
      const v = String(req.body.roleTitle ?? "").trim();
      patch.roleTitle = v || undefined;
    }

    const updated = await WebsiteTeamEntry.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).populate("userRef", "name email membershipId role portalAccessEnabled");

    if (!updated) return res.status(404).json({ message: "Entry not found" });
    return res.json({ entry: updated });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Entry already exists for this year" });
    }
    return res
      .status(500)
      .json({ message: "Failed to update entry", error: error.message });
  }
};

export const deleteWebsiteTeamEntry = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "id is required" });

    const deleted = await WebsiteTeamEntry.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete entry", error: error.message });
  }
};

export const reorderWebsiteTeamEntries = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const category = normalize(req.body?.category) || "execom";
    const year = String(req.body?.year ?? "").trim();
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((v) => String(v).trim()).filter(Boolean)
      : [];

    if (!year || orderedIds.length === 0) {
      return res
        .status(400)
        .json({ message: "year and orderedIds are required" });
    }

    const entries = await WebsiteTeamEntry.find({
      _id: { $in: orderedIds },
      category,
      year,
    })
      .select("_id")
      .lean();

    if (entries.length !== orderedIds.length) {
      return res
        .status(400)
        .json({ message: "All entries must belong to the same year/category" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, category, year },
        update: { $set: { order: index } },
      },
    }));

    await WebsiteTeamEntry.bulkWrite(bulkOps);
    return res.json({ message: "Reordered" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to reorder", error: error.message });
  }
};

export const promoteToTeam = async (req, res) => {
  const {
    registrationId,
    memberType: memberTypeRaw,
    role,
    customRole,
    permissions,
    portalAccessEnabled,
  } = req.body;

  if (!hasPermission(req.user, "users")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!registrationId) {
    return res.status(400).json({ message: "registrationId is required" });
  }

  const requestedMemberType =
    memberTypeRaw !== undefined ? normalizeMemberType(memberTypeRaw) : null;
  if (memberTypeRaw !== undefined && !requestedMemberType) {
    return res
      .status(400)
      .json({
        message: "memberType must be 'student', 'staff', 'guest', or omit it",
      });
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
    let member = null;
    let memberSource = "registration";

    if (requestedMemberType === "student") {
      member = await Registration.findById(registrationId);
      memberSource = "registration";
    } else if (
      requestedMemberType === "staff" ||
      requestedMemberType === "guest"
    ) {
      member = await StaffGuestRegistration.findById(registrationId);
      memberSource = "staffGuest";
      if (!member) {
        member = await Registration.findOne({
          _id: registrationId,
          userType: requestedMemberType,
        });
        memberSource = "registration";
      }
    } else {
      member = await Registration.findById(registrationId);
      memberSource = "registration";
      if (!member) {
        member = await StaffGuestRegistration.findById(registrationId);
        memberSource = "staffGuest";
      }
    }

    if (!member) return res.status(404).json({ message: "Member not found" });

    const actualMemberType =
      normalize(member?.userType) ||
      (memberSource === "staffGuest" ? "staff" : "student");
    if (
      requestedMemberType &&
      requestedMemberType !== "all" &&
      requestedMemberType !== actualMemberType
    ) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (!member.membershipId) {
      return res
        .status(400)
        .json({ message: "Member does not have a membershipId" });
    }

    if (String(member.membershipId).trim().toLowerCase() === "admin") {
      return res
        .status(400)
        .json({ message: "membershipId 'admin' is reserved" });
    }

    const existing = await User.findOne({
      $or: [{ membershipId: member.membershipId }, { email: member.email }],
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
      name: `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim(),
      email: member.email,
      membershipId: member.membershipId,
      password: tempPasswordHash,
      role: finalRole,
      permissions: finalPermissions,
      portalAccessEnabled: nextPortalAccessEnabled,

      ...(memberSource === "registration"
        ? { registrationRef: member._id }
        : {}),

      ...(tokenBundle
        ? {
            passwordSetupTokenHash: tokenBundle.passwordSetupTokenHash,
            passwordSetupExpiresAt: tokenBundle.expiresAt,
          }
        : {}),
    });

    const emailSent = tokenBundle
      ? await sendPasswordSetupEmail({
          to: member.email,
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

    const requestedPerms = limitClubPortalPermissions(
      permissions,
      req.user?.permissions,
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
    res.status(500).json({
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
      user.permissions = limitClubPortalPermissions(
        permissions,
        req.user?.permissions,
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
    res.status(500).json({
      message: "Failed to update club portal member",
      error: error.message,
    });
  }
};
