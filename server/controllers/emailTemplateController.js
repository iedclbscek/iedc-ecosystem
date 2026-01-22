import EmailTemplate from "../models/EmailTemplate.js";
import Registration from "../models/Registration.js";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";
import { hasPermission } from "../middleware/requireAuth.js";

const normalizeKey = (key) =>
  String(key ?? "")
    .trim()
    .toLowerCase();

export const listEmailTemplates = async (req, res) => {
  try {
    const search = String(req.query.search ?? req.query.q ?? "").trim();
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { subject: { $regex: search, $options: "i" } },
            { key: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const templates = await EmailTemplate.find(filter)
      .select("key name subject isBase updatedAt createdAt")
      .sort({ updatedAt: -1 });
    res.json({ templates });
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

const isValidEmail = (email) => {
  const value = normalize(email);
  if (!value) return false;
  // Basic validation; avoids rejecting real-world emails too aggressively.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const subject = template.subject || template.name || "Email";
    const baseData =
      defaultData &&
      typeof defaultData === "object" &&
      !Array.isArray(defaultData)
        ? defaultData
        : {};

    // Send to all active members
    if (mode === "all") {
      const members = await Registration.find({
        status: "active",
        email: { $exists: true, $ne: "" },
      })
        .select(
          "email firstName lastName membershipId admissionNo department semester status",
        )
        .lean();

      const targets = members
        .map((m) => {
          const email = normalize(m?.email);
          if (!isValidEmail(email)) return null;
          const name =
            normalize(`${m?.firstName ?? ""} ${m?.lastName ?? ""}`) ||
            undefined;
          return {
            email,
            data: {
              ...baseData,
              ...m,
              ...(name ? { name } : {}),
            },
          };
        })
        .filter(Boolean);

      const results = await sendManyWithConcurrency({
        items: targets,
        concurrency: 5,
        sendOne: async (t) => {
          const html = renderTemplate(template.html, t.data);
          return sendMail({ to: t.email, subject, html });
        },
      });

      let sent = 0;
      let failed = 0;
      const failures = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const email = targets[i]?.email;
        if (r.status === "fulfilled" && r.value?.sent) {
          sent++;
        } else {
          failed++;
          const reason =
            r.status === "fulfilled"
              ? r.value?.reason || "Email not sent"
              : r.reason?.message || "Failed";
          if (failures.length < 10) failures.push({ email, reason });
        }
      }

      return res.json({
        mode: "all",
        total: targets.length,
        sent,
        failed,
        failures,
      });
    }

    // Send to list
    if (mode === "list") {
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "recipients is required" });
      }
      if (recipients.length > 2000) {
        return res.status(400).json({ message: "Too many recipients" });
      }

      const targets = recipients
        .map((r) => {
          const email = normalize(r?.email);
          if (!isValidEmail(email)) return null;
          const rowData =
            r?.data && typeof r.data === "object" && !Array.isArray(r.data)
              ? r.data
              : {};
          return { email, data: { ...baseData, ...rowData } };
        })
        .filter(Boolean);

      if (targets.length === 0) {
        return res
          .status(400)
          .json({ message: "No valid recipient emails found" });
      }

      const results = await sendManyWithConcurrency({
        items: targets,
        concurrency: 5,
        sendOne: async (t) => {
          const html = renderTemplate(template.html, t.data);
          return sendMail({ to: t.email, subject, html });
        },
      });

      let sent = 0;
      let failed = 0;
      const failures = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const email = targets[i]?.email;
        if (r.status === "fulfilled" && r.value?.sent) {
          sent++;
        } else {
          failed++;
          const reason =
            r.status === "fulfilled"
              ? r.value?.reason || "Email not sent"
              : r.reason?.message || "Failed";
          if (failures.length < 10) failures.push({ email, reason });
        }
      }

      return res.json({
        mode: "list",
        total: targets.length,
        sent,
        failed,
        failures,
      });
    }

    return res.status(400).json({ message: "sendTo must be 'all' or 'list'" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to bulk send email", error: error.message });
  }
};
