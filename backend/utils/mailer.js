import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    const host = process.env.MAILTRAP_SMTP_HOST;
    const port = Number(process.env.MAILTRAP_SMTP_PORT) || 2525;
    const user = process.env.MAILTRAP_SMTP_USER;
    const pass = process.env.MAILTRAP_SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn("[Mailer] Mailtrap SMTP credentials missing in .env. Skipping email dispatch.");
      return null;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for 2525/587
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"AutoResolve AI" <support@autoresolve.ai>',
      to,
      subject,
      text,
    });

    console.log(`[Mailer] Message sent to ${to} (ID: ${info.messageId}) ✅`);
    return info;
  } catch (error) {
    console.error("❌ Mail error", error.message);
    throw error;
  }
};