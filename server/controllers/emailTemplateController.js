import EmailTemplate from "../models/EmailTemplate.js";
import {
  AudienceFilterError,
  parseAudienceFilters,
  parseAudiencePage,
  getAudienceSummary,
  findAudienceMembers,
  validEmailPattern,
} from "../utils/activeMemberAudience.js";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import { hasPermission } from "../middleware/requireAuth.js";
import { paginationMeta, parsePagination } from "../utils/pagination.js";

const normalizeKey = (key) =>
  String(key ?? "")
    .trim()
    .toLowerCase();

export const listEmailTemplates = async (req, res) => {
  try {
    const search = String(req.query.search ?? req.query.q ?? "").trim();
    const searchPattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = search
      ? {
          $or: [
            { name: { $regex: searchPattern, $options: "i" } },
            { subject: { $regex: searchPattern, $options: "i" } },
            { key: { $regex: searchPattern, $options: "i" } },
          ],
        }
      : {};

    const paginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20 });
    const total = paginated ? await EmailTemplate.countDocuments(filter) : 0;
    const meta = paginated ? paginationMeta({ page, limit, total }) : null;
    let templatesQuery = EmailTemplate.find(filter)
      .select("key name subject isBase updatedAt createdAt")
      .sort({ updatedAt: -1, _id: -1 });
    if (meta) templatesQuery = templatesQuery.skip((meta.page - 1) * limit).limit(limit);
    const templates = await templatesQuery;
    res.json({ templates, ...(meta || {}) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch templates", error: error.message });
  }
};

export const deleteEmailTemplate = async (req, res) => {
  try {
    if (!hasPermission(req.user, "mailer")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const template = await EmailTemplate.findById(req.params.id);
    if (!template)
      return res.status(404).json({ message: "Template not found" });
    if (template.isBase) {
      return res
        .status(400)
        .json({ message: "Base templates cannot be deleted" });
    }

    await template.deleteOne();
    return res.json({ message: "Deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete template", error: error.message });
  }
};

export const upsertSystemTemplate = async ({ key, name, subject, html }) => {
  const finalKey = normalizeKey(key);
  if (!finalKey) throw new Error("key is required");

  const existing = await EmailTemplate.findOne({ key: finalKey });
  if (existing) {
    existing.name = name ?? existing.name;
    existing.subject = subject ?? existing.subject;
    existing.html = html ?? existing.html;
    existing.isBase = true;
    await existing.save();
    return existing;
  }

  return EmailTemplate.create({
    key: finalKey,
    name,
    subject,
    html,
    isBase: true,
  });
};

export const getEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template)
      return res.status(404).json({ message: "Template not found" });
    res.json({ template });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch template", error: error.message });
  }
};

export const createEmailTemplate = async (req, res) => {
  const { key, name, subject, html, isBase } = req.body;

  const finalKey = normalizeKey(key);
  if (!finalKey) return res.status(400).json({ message: "key is required" });

  const finalName = String(name ?? "").trim();
  if (!finalName) return res.status(400).json({ message: "name is required" });

  const finalHtml = String(html ?? "");
  if (!finalHtml.trim())
    return res.status(400).json({ message: "html is required" });

  try {
    const existing = await EmailTemplate.findOne({ key: finalKey });
    if (existing)
      return res.status(409).json({ message: "Template key already exists" });

    const template = await EmailTemplate.create({
      key: finalKey,
      name: finalName,
      subject: String(subject ?? "").trim(),
      html: finalHtml,
      isBase: Boolean(isBase),
    });

    res.status(201).json({ template });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create template", error: error.message });
  }
};

export const updateEmailTemplate = async (req, res) => {
  const { name, subject, html } = req.body;

  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template)
      return res.status(404).json({ message: "Template not found" });

    if (name !== undefined) template.name = String(name ?? "").trim();
    if (subject !== undefined) template.subject = String(subject ?? "").trim();
    if (html !== undefined) template.html = String(html ?? "");

    if (!String(template.name ?? "").trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    if (!String(template.html ?? "").trim()) {
      return res.status(400).json({ message: "html is required" });
    }

    await template.save();
    res.json({ template });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update template", error: error.message });
  }
};

export const sendTestEmailTemplate = async (req, res) => {
  const { to, data } = req.body;
  const finalTo = String(to ?? "").trim();
  if (!finalTo) return res.status(400).json({ message: "to is required" });

  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template)
      return res.status(404).json({ message: "Template not found" });

    const subject = template.subject || `Test: ${template.name}`;
    const html = renderTemplate(template.html, data);

    const result = await sendMail({ to: finalTo, subject, html });

    res.json({ sent: Boolean(result?.sent), reason: result?.reason });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send test email", error: error.message });
  }
};

const normalize = (v) => String(v ?? "").trim();

export const getActiveMemberAudience = async (req, res) => {
  if (!hasPermission(req.user, "mailer")) return res.status(403).json({ message: "Forbidden" });
  try {
    const { page: rawPage, ...filters } = req.query || {};
    const page = parseAudiencePage(rawPage);
    const match = parseAudienceFilters(filters);
    return res.json(await getAudienceSummary(match, page));
  } catch (error) {
    if (error instanceof AudienceFilterError) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Failed to load email audience" });
  }
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const sendManyWithConcurrency = async ({ items, concurrency, sendOne }) => {
  const batches = chunk(items, Math.max(1, concurrency));
  const results = [];
  for (const batch of batches) {
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.allSettled(batch.map(sendOne));
    results.push(...settled);
  }
  return results;
};

export const sendBulkEmailTemplate = async (req, res) => {
  try {
    if (!hasPermission(req.user, "mailer")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { sendTo, recipients, data: defaultData } = req.body || {};
    const mode = normalize(sendTo).toLowerCase();

    let match;
    if (mode === "all") {
      if (Object.keys(req.query || {}).length) {
        return res.status(400).json({ message: "Place audience filters in the request body" });
      }
      if (Object.keys(req.body).some(key => !["sendTo", "data", "filters"].includes(key))) {
        return res.status(400).json({ message: "All-member sends accept sendTo, data and optional filters" });
      }
      match = parseAudienceFilters(req.body.filters);
    } else if (mode === "list") {
      if (req.body.filters !== undefined) {
        return res.status(400).json({ message: "Audience filters apply only to all-member sends" });
      }
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "recipients is required" });
      }
      if (recipients.length > 2000) return res.status(400).json({ message: "Too many recipients" });
    } else {
      return res.status(400).json({ message: "sendTo must be 'all' or 'list'" });
    }

    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });
    const subject = template.subject || template.name || "Email";
    const baseData = defaultData && typeof defaultData === "object" && !Array.isArray(defaultData) ? defaultData : {};
    let targets;
    if (mode === "all") {
      const members = await findAudienceMembers(match);
      targets = members.map(member => {
        const name = normalize(`${member.firstName ?? ""} ${member.lastName ?? ""}`);
        return { email: member.email, data: { ...baseData, ...member, ...(name && { name }) } };
      });
    } else {
      targets = recipients.flatMap(recipient => {
        const email = normalize(recipient?.email);
        if (!validEmailPattern.test(email)) return [];
        const rowData = recipient?.data;
        const data = rowData && typeof rowData === "object" && !Array.isArray(rowData) ? rowData : {};
        return [{ email, data: { ...baseData, ...data } }];
      });
      if (!targets.length) return res.status(400).json({ message: "No valid recipient emails found" });
    }

    const results = await sendManyWithConcurrency({
      items: targets,
      concurrency: 5,
      sendOne: target => sendMail({ to: target.email, subject, html: renderTemplate(template.html, target.data) }),
    });
    let sent = 0;
    const failures = [];
    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled" && result.value?.sent) {
        sent++;
      } else if (failures.length < 10) {
        const reason = result.status === "fulfilled" ? result.value?.reason : result.reason?.message;
        failures.push({ email: targets[index].email, reason: reason || "Email not sent" });
      }
    }

    return res.json({ mode, total: targets.length, sent, failed: targets.length - sent, failures });
  } catch (error) {
    if (error instanceof AudienceFilterError) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Failed to bulk send email", error: error.message });
  }
};
