import EmailTemplate from "../models/EmailTemplate.js";
import { sendMail } from "../utils/mailer.js";
import { renderTemplate } from "../utils/templateRenderer.js";

const normalizeKey = (key) =>
  String(key ?? "")
    .trim()
    .toLowerCase();

export const listEmailTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find({})
      .select("key name subject isBase updatedAt createdAt")
      .sort({ updatedAt: -1 });
    res.json({ templates });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch templates", error: error.message });
  }
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
