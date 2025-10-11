import express from "express";
import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";
import db from "./db.js";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import util from "util";

// Load environment variables
dotenv.config();

const authentication = express.Router();
authentication.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
const adminEmails = ["admin@example.com", "admin@talentpool.com"];

// Promisify db.query for async/await
const query = util.promisify(db.query).bind(db);

// =================== Nodemailer ===================
// Use Gmail App Password here (not your normal password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// Verify transporter on startup
transporter.verify((err, success) => {
  if (err) console.error("❌ SMTP Connection Error:", err);
  else console.log("✅ SMTP Server ready to send emails");
});

// Helper to send emails
const sendMail = async (to, subject, html) => {
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

// =================== JWT Helper ===================
const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

// =================== REGISTER ===================
authentication.post("/registerAuthen", async (req, res) => {
  const { name, email, password } = req.body;
  console.log("📝 Registration attempt:", { name, email });

  try {
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await query(
      "SELECT * FROM authentication WHERE email = ?",
      [email]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = adminEmails.includes(email) ? "admin" : "student";

    await query(
      "INSERT INTO authentication (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    const token = generateAccessToken({ email, role });

    // Send welcome email
    try {
      const info = await sendMail(
        email,
        "🎉 Welcome to Talent Pool!",
        `<h2>Hello ${name},</h2>
         <p>Welcome to <strong>Talent Pool</strong>! We’re thrilled to have you on board.</p>
         <p>Get ready to explore, innovate, and grow with our team. Stay connected and let’s build the future of tech together!</p>
         <p>Best regards,<br/>The Talent Pool Team</p>`
      );

      return res.status(201).json({
        message: "User registered successfully",
        token,
        role,
        emailSent: true,
        messageId: info.messageId,
      });
    } catch (mailErr) {
      return res.status(201).json({
        message: "User registered but email failed",
        token,
        role,
        emailSent: false,
        warning: mailErr.message,
      });
    }
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
});

// =================== LOGIN ===================
authentication.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const result = await query(
      "SELECT * FROM authentication WHERE email = ?",
      [email]
    );
    if (result.length === 0)
      return res.status(400).json({ message: "Invalid email or password" });

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = generateAccessToken({ email: user.email, role: user.role });
    const refreshToken = uuidv4();

    await query(
      "INSERT INTO refresh_tokens (token, email) VALUES (?, ?)",
      [refreshToken, email]
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

// =================== LOGOUT ===================
authentication.post("/logout", async (req, res) => {
  const { refreshToken } = req.cookies;
  try {
    if (!refreshToken)
      return res.status(400).json({ message: "No refresh token found" });

    await query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ Logout error:", err);
    return res.status(500).json({ message: "Logout failed" });
  }
});

// =================== TOKEN VERIFICATION ===================
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(403).json({ message: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// =================== FORGOT PASSWORD ===================
authentication.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const users = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "Email not found" });

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Save token in DB
    await query(
      "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
      [email, resetToken, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    await sendMail(
      email,
      "🔑 Reset your password",
      `<p>Hello, ${email}</p>
       <p>You requested a password reset. Click the link below to reset your password:</p>
       <p><a href="${resetLink}">Reset Password</a></p>
       <p>This link will expire in 1 hour.</p>`
    );

    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Failed to send password reset email" });
  }
});

// =================== RESET PASSWORD ===================
authentication.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ message: "New password is required" });

  try {
    const rows = await query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

    const email = rows[0].email;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query("UPDATE authentication SET password = ? WHERE email = ?", [hashedPassword, email]);

    // Delete token
    await query("DELETE FROM password_resets WHERE token = ?", [token]);

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});


// =================== GET SINGLE USER ===================
authentication.get("/users/:email", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { email } = req.params;
    const users = await query(
      "SELECT name, email, role FROM authentication WHERE email = ?",
      [email]
    );

    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    res.status(200).json(users[0]);
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// =================== UPDATE USER PROFILE ===================
authentication.put("/users/:email", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { email } = req.params;
    const { name, role } = req.body;

    const result = await query(
      "UPDATE authentication SET name = ?, role = ? WHERE email = ?",
      [name, role, email]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found or no changes made" });

    res.status(200).json({ message: "User profile updated successfully" });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// =================== DELETE USER ===================
authentication.delete("/users/:email", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { email } = req.params;

    const result = await query("DELETE FROM authentication WHERE email = ?", [email]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});


// =================== GET ALL REGISTERED USERS ===================
authentication.get("/users", verifyToken, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch all users (excluding passwords)
    const users = await query("SELECT name, email, role FROM authentication");

    res.status(200).json({
      totalUsers: users.length,
      users,
    });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});


// =================== GET TOTAL NUMBER OF USERS ===================
authentication.get("/total-users", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch all users (excluding passwords)
    const users = await query("SELECT role FROM authentication");

    // Count students only
    const totalStudents = users.filter(u => u.role === "student").length;

    res.status(200).json({
      totalRegistered: users.length, // total users
      totalStudents,                 // total students
    });
  } catch (err) {
    console.error("❌ Error fetching total users:", err);
    res.status(500).json({ message: "Failed to fetch total users" });
  }
});


// =================== GET LOGGED-IN USER PROFILE ===================
authentication.get("/profile", verifyToken, async (req, res) => {
  try {
    // Get the user's email from the token
    const email = req.user.email;

    // Fetch user data excluding password
    const users = await query(
      "SELECT name, email, role FROM authentication WHERE email = ?",
      [email]
    );

    if (users.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json(users[0]);
  } catch (err) {
    console.error("❌ Error fetching user profile:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// =================== UPDATE PASSWORD ===================
authentication.put("/update-password", verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Both current and new password are required" });
  }

  try {
    // Fetch user by email from token
    const email = req.user.email;
    const users = await query("SELECT * FROM authentication WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query("UPDATE authentication SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Update password error:", err);
    return res.status(500).json({ message: "Failed to update password" });
  }
});


authentication.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token found" });

  try {
    const rows = await query("SELECT * FROM refresh_tokens WHERE token = ?", [refreshToken]);
    if (rows.length === 0) return res.status(403).json({ message: "Invalid refresh token" });

    const userEmail = rows[0].email;
    const userRow = await query("SELECT email, role FROM authentication WHERE email = ?", [userEmail]);
    if (userRow.length === 0) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ email: userRow[0].email, role: userRow[0].role }, JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ token });
  } catch (err) {
    console.error("❌ Refresh token error:", err);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

export default authentication;
