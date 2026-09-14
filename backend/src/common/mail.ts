import { log } from "./logger";
import { isProduction } from "./env";

export async function sendMail(opts: { to: string; subject: string; text: string }) {
  const from = process.env.MAIL_FROM?.trim() || "CodeAtlas <noreply@localhost>";
  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.text }),
    });
    if (!response.ok) {
      log("error", "mail.resend_failed", { status: response.status });
      throw new Error("Email delivery failed.");
    }
    return;
  }

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
    await transporter.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text });
    return;
  }

  if (isProduction()) {
    log("warn", "mail.skipped_no_transport", { subject: opts.subject });
    return;
  }
  log("info", "mail.dev_preview", { to: opts.to, subject: opts.subject, text: opts.text });
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
}
