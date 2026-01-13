import nodemailer from "nodemailer";

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  // If you later add SMTP_HOST/SMTP_PORT, you can switch to a custom SMTP transport.
  // For now, default to a typical SMTP auth transport that works for many providers.
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const secure = process.env.SMTP_SECURE === "true";

  if (host && port) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Common default (works for Gmail/Workspace app passwords)
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

export const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    // Don’t crash the request if email isn’t configured.
    return { sent: false, reason: "EMAIL_USER/EMAIL_PASS not configured" };
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error?.message || "Failed to send email" };
  }
};
