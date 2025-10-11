// =================== IMPORTS ===================
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { JWT_SECRET } from "./auth.constants.js";

// =================== JWT HELPER ===================
/**
 * Generates a JWT access token valid for 1 hour
 * @param {Object} payload - The payload to encode
 * @returns {string} JWT token
 */
export const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

// =================== EMAIL TRANSPORTER ===================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail email address
    pass: process.env.EMAIL_PASS, // Gmail app password
  },
});

// Verify SMTP connection
transporter.verify((err) => {
  if (err) console.error("❌ SMTP Connection Error:", err);
  else console.log("✅ SMTP Server ready");
});

// =================== SEND EMAIL HELPER ===================
/**
 * Sends an email using nodemailer
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise<Object>} Info about the sent email
 */
export const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Talent Pool" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error;
  }
};
