import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";
import User from "../models/User.js";
import EmailTemplate from "../models/EmailTemplate.js";
import Club from "../models/Club.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import { hasPermission } from "../middleware/requireAuth.js";
import { upsertSystemTemplate } from "./emailTemplateController.js";
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

const getSelfUpdateTokenSecret = () => {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

const signSelfUpdateToken = (entryId) => {
  const secret = getSelfUpdateTokenSecret();
  return jwt.sign({ entryId, typ: "team-self-update" }, secret, {
    expiresIn: "7d",
  });
};

const verifySelfUpdateToken = (token) => {
  const secret = getSelfUpdateTokenSecret();
  const payload = jwt.verify(String(token || ""), secret);
  if (payload?.typ !== "team-self-update") {
    throw new Error("Invalid token type");
  }
  return payload;
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
      return res.status(400).json({
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
          ? Registration.find({ $or: baseOr }).sort({ createdAt: -1 }).limit(20)
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
  let entryType = "user";
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const category = normalize(req.body?.category) || "execom";
    const year = String(req.body?.year ?? "").trim();
    entryType = normalize(req.body?.entryType) === "custom" ? "custom" : "user";
    const userId = String(req.body?.userId ?? "").trim();
    const customName = String(req.body?.customName ?? "").trim();
    const customEmail = String(req.body?.customEmail ?? "").trim();
    const customMembershipId = String(
      req.body?.customMembershipId ?? "",
    ).trim();
    const imageUrl = String(req.body?.imageUrl ?? "").trim();
    const linkedin = String(req.body?.linkedin ?? "").trim();
    const github = String(req.body?.github ?? "").trim();
    const twitter = String(req.body?.twitter ?? "").trim();
    const roleTitle = String(req.body?.roleTitle ?? "").trim() || undefined;
    const visible =
      req.body?.visible !== undefined ? Boolean(req.body.visible) : true;

    if (!year) {
      return res.status(400).json({ message: "year is required" });
    }

    let user = null;
    if (entryType === "user") {
      if (!userId) {
        return res
          .status(400)
          .json({ message: "userId is required for user entries" });
      }
      user = await User.findById(userId).select("_id");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    } else if (entryType === "custom") {
      if (!customName) {
        return res
          .status(400)
          .json({ message: "customName is required for custom entries" });
      }
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
      entryType,
      userRef: user?._id,
      customName: entryType === "custom" ? customName : undefined,
      customEmail:
        entryType === "custom" ? customEmail || undefined : undefined,
      customMembershipId:
        entryType === "custom" ? customMembershipId || undefined : undefined,
      imageUrl: imageUrl || undefined,
      linkedin: linkedin || undefined,
      github: github || undefined,
      twitter: twitter || undefined,
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
      const message =
        entryType === "user"
          ? "This user is already added for this year"
          : "An entry already exists for this year";
      return res.status(409).json({ message });
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

    const entry = await WebsiteTeamEntry.findById(id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (req.body?.year !== undefined)
      entry.year = String(req.body.year ?? "").trim();
    if (req.body?.visible !== undefined)
      entry.visible = Boolean(req.body.visible);
    if (req.body?.roleTitle !== undefined) {
      const v = String(req.body.roleTitle ?? "").trim();
      entry.roleTitle = v || undefined;
    }
    if (req.body?.customName !== undefined) {
      const v = String(req.body.customName ?? "").trim();
      entry.customName = v || undefined;
    }
    if (req.body?.customEmail !== undefined) {
      const v = String(req.body.customEmail ?? "").trim();
      entry.customEmail = v || undefined;
    }
    if (req.body?.customMembershipId !== undefined) {
      const v = String(req.body.customMembershipId ?? "").trim();
      entry.customMembershipId = v || undefined;
    }
    if (req.body?.imageUrl !== undefined) {
      const v = String(req.body.imageUrl ?? "").trim();
      entry.imageUrl = v || undefined;
    }
    if (req.body?.linkedin !== undefined) {
      const v = String(req.body.linkedin ?? "").trim();
      entry.linkedin = v || undefined;
    }
    if (req.body?.github !== undefined) {
      const v = String(req.body.github ?? "").trim();
      entry.github = v || undefined;
    }
    if (req.body?.twitter !== undefined) {
      const v = String(req.body.twitter ?? "").trim();
      entry.twitter = v || undefined;
    }

    await entry.save();
    await entry.populate(
      "userRef",
      "name email membershipId role portalAccessEnabled",
    );

    return res.json({ entry });
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

export const requestWebsiteTeamUpdateEmail = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "id is required" });

    const entry = await WebsiteTeamEntry.findById(id).populate(
      "userRef",
      "name email membershipId",
    );
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    const to = entry.userRef?.email || entry.customEmail;
    if (!to) {
      return res
        .status(400)
        .json({ message: "No email available for this member" });
    }

    const name = entry.userRef?.name || entry.customName || "there";
    const year = entry.year || "";
    const role = entry.roleTitle || "Member";
    const token = signSelfUpdateToken(entry._id);
    const portalUrl = getAdminPortalUrl();
    const updateLink = `${portalUrl}/team-entry/update?token=${encodeURIComponent(token)}`;
    const subject = `Update your IEDC website profile${year ? ` (${year})` : ""}`;

    const htmlTemplate = `
<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Update your IEDC website profile</title>
	</head>
	<body style="margin:0;padding:0;background:#0b1220;">
		<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0b1220;padding:28px 12px;">
			<tr>
				<td align="center">
					<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
						<tr>
							<td style="padding:22px 22px 10px 22px;background:linear-gradient(135deg,#111827,#0b1220);">
								<div style="text-align:center;">
									<img src="https://1a5da14deb.imgdist.com/pub/bfra/uqpdfms1/wx7/bcf/n6i/iedc-lbs-logo.png" alt="IEDC LBSCEK" width="140" style="display:inline-block;border:0;max-width:140px;height:auto;" />
								</div>
								<div style="text-align:center;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;margin-top:14px;">
									Profile Update Request
								</div>
								<div style="text-align:center;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;margin-top:6px;line-height:1.6;">
									We need your latest photo and social links.
								</div>
							</td>
						</tr>
						<tr>
							<td style="padding:22px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
								<p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;">Hi {{name}},</p>
								<p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;">
									We're refreshing the IEDC website roster and need your latest information. Please update your photo and social media links using the secure link below.
								</p>

								<div style="border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc;padding:16px 14px;margin-bottom:16px;">
									<div style="font-size:12px;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;">Current Info</div>
									<div style="margin:6px 0;font-size:14px;color:#1e293b;">
										<strong>Year:</strong> {{year}}
									</div>
									<div style="margin:6px 0;font-size:14px;color:#1e293b;">
										<strong>Role:</strong> {{role}}
									</div>
									<div style="margin:6px 0;font-size:13px;color:#475569;">
										<strong>LinkedIn:</strong> {{linkedin}}
									</div>
									<div style="margin:6px 0;font-size:13px;color:#475569;">
										<strong>GitHub:</strong> {{github}}
									</div>
									<div style="margin:6px 0;font-size:13px;color:#475569;">
										<strong>Twitter:</strong> {{twitter}}
									</div>
								</div>

								<p style="margin:0 0 18px 0;font-size:13px;color:#64748b;line-height:1.7;">
									This link is valid for 7 days. You can upload a square photo and update your social links. Year, role, and visibility are managed by the admin team.
								</p>

								<div style="text-align:center;margin:20px 0;">
									<a href="{{updateLink}}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
										Open Update Page
									</a>
								</div>

								<p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
									If the button doesn't work, copy and paste this link:<br/>
									<a href="{{updateLink}}" style="color:#3b82f6;word-break:break-all;">{{updateLink}}</a>
								</p>
							</td>
						</tr>
						<tr>
							<td style="padding:14px 22px;background:#0b1220;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-align:center;">
								© 2026 IEDC LBSCEK Web Team<br/>
								<span style="font-size:11px;color:#64748b;margin-top:4px;display:inline-block;">If you didn't expect this email, you can safely ignore it.</span>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
    `;

    const template = await EmailTemplate.findOne({
      key: "team_profile_update",
    });
    const htmlSource = template?.html || htmlTemplate;
    const subjectFromTemplate = template?.subject || subject;

    const html = renderTemplate(htmlSource, {
      name,
      year: year || "—",
      role,
      linkedin: entry.linkedin || "—",
      github: entry.github || "—",
      twitter: entry.twitter || "—",
      updateLink,
    });

    // Ensure template exists in email center without overwriting user edits
    if (!template) {
      await upsertSystemTemplate({
        key: "team_profile_update",
        name: "Team Profile Update",
        subject: "Update your IEDC website profile",
        html: htmlTemplate,
      });
    }

    const result = await sendMail({ to, subject: subjectFromTemplate, html });
    if (!result?.sent) {
      return res
        .status(500)
        .json({ message: "Failed to send email", reason: result?.reason });
    }

    return res.json({ sent: true, message: "Update request email sent" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
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

export const uploadFreeImage = async (req, res) => {
  try {
    if (!hasPermission(req.user, "users")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const apiKey = String(
      process.env.FREEIMAGE_API_KEY || process.env.VITE_FREEIMAGE_API_KEY || "",
    ).trim();
    if (!apiKey) {
      return res
        .status(500)
        .json({ message: "Image upload key not configured" });
    }

    const source = String(req.body?.source ?? "").trim();
    if (!source) {
      return res
        .status(400)
        .json({ message: "source is required (base64 string)" });
    }

    const form = new URLSearchParams();
    form.append("key", apiKey);
    form.append("action", "upload");
    form.append("source", source);
    form.append("format", "json");

    const response = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: form,
    });

    const result = await response.json();
    if (!response.ok || !result?.image?.url) {
      const status =
        result?.status_txt || result?.error?.message || "Upload failed";
      return res.status(502).json({ message: status });
    }

    return res.json({ url: result.image.url, response: result });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to upload image", error: error.message });
  }
};

const uploadImageFromBase64 = async (source) => {
  const apiKey = String(
    process.env.FREEIMAGE_API_KEY || process.env.VITE_FREEIMAGE_API_KEY || "",
  ).trim();
  if (!apiKey) {
    throw new Error("Image upload key not configured");
  }

  const form = new URLSearchParams();
  form.append("key", apiKey);
  form.append("action", "upload");
  form.append("source", source);
  form.append("format", "json");

  const response = await fetch("https://freeimage.host/api/1/upload", {
    method: "POST",
    body: form,
  });

  const result = await response.json();
  if (!response.ok || !result?.image?.url) {
    const status =
      result?.status_txt || result?.error?.message || "Upload failed";
    const err = new Error(status);
    err.statusCode = 502;
    throw err;
  }

  return { url: result.image.url, response: result };
};

export const getWebsiteTeamEntrySelf = async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) return res.status(400).json({ message: "token is required" });

    const payload = verifySelfUpdateToken(token);
    const entry = await WebsiteTeamEntry.findById(payload.entryId).populate(
      "userRef",
      "name email membershipId",
    );
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    return res.json({
      entry: {
        id: entry._id,
        year: entry.year,
        roleTitle: entry.roleTitle || "",
        visible: Boolean(entry.visible),
        imageUrl: entry.imageUrl || "",
        linkedin: entry.linkedin || "",
        github: entry.github || "",
        twitter: entry.twitter || "",
        name: entry.userRef?.name || entry.customName || "",
        email: entry.userRef?.email || entry.customEmail || "",
      },
    });
  } catch (error) {
    const status = error?.name === "TokenExpiredError" ? 401 : 400;
    return res
      .status(status)
      .json({ message: error?.message || "Invalid token" });
  }
};

export const updateWebsiteTeamEntrySelf = async (req, res) => {
  try {
    const token = String(req.body?.token || req.query.token || "").trim();
    if (!token) return res.status(400).json({ message: "token is required" });

    const payload = verifySelfUpdateToken(token);
    const entry = await WebsiteTeamEntry.findById(payload.entryId).populate(
      "userRef",
      "name email membershipId",
    );
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    const next = {
      linkedin: req.body?.linkedin,
      github: req.body?.github,
      twitter: req.body?.twitter,
      imageUrl: req.body?.imageUrl,
    };

    if (next.linkedin !== undefined)
      entry.linkedin = String(next.linkedin || "").trim() || undefined;
    if (next.github !== undefined)
      entry.github = String(next.github || "").trim() || undefined;
    if (next.twitter !== undefined)
      entry.twitter = String(next.twitter || "").trim() || undefined;

    // Allow either direct URL or base64 upload
    const imageBase64 = String(req.body?.imageBase64 || "").trim();
    if (imageBase64) {
      const uploaded = await uploadImageFromBase64(imageBase64);
      entry.imageUrl = uploaded.url;
    } else if (next.imageUrl !== undefined) {
      entry.imageUrl = String(next.imageUrl || "").trim() || undefined;
    }

    await entry.save();

    return res.json({
      entry: {
        id: entry._id,
        year: entry.year,
        roleTitle: entry.roleTitle || "",
        visible: Boolean(entry.visible),
        imageUrl: entry.imageUrl || "",
        linkedin: entry.linkedin || "",
        github: entry.github || "",
        twitter: entry.twitter || "",
        name: entry.userRef?.name || entry.customName || "",
        email: entry.userRef?.email || entry.customEmail || "",
      },
    });
  } catch (error) {
    const status = error?.name === "TokenExpiredError" ? 401 : 400;
    const message = error?.statusCode ? error.message : error?.message;
    return res
      .status(error?.statusCode || status)
      .json({ message: message || "Failed to update" });
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
    return res.status(400).json({
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
