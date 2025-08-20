import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // your Gmail
    pass: process.env.EMAIL_PASS,  // Gmail App Password
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) console.error("❌ SMTP connection failed:", error);
  else console.log("✅ SMTP server ready to send emails");
});

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
export async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Talent Pool" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Email sent successfully to ${to}: ${info.response}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    throw err;
  }
}
