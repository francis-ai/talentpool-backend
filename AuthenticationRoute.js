import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import util from "util";
import { verifyToken } from "./Auth/AuthenticationMiddleware.js";
// Load environment variables
dotenv.config();

const authentication = express.Router();
authentication.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
const adminEmails = ["admin@example.com", "admin@talentpool.com"];

// Promisify db.query
const query = util.promisify(db.query).bind(db);

// =================== Nodemailer ===================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) console.error("❌ SMTP Connection Error:", err);
  else console.log("✅ SMTP Server ready to send emails");
});

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
  try {
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = adminEmails.includes(email) ? "admin" : "student";

    await query(
      "INSERT INTO authentication (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    const token = generateAccessToken({ email, role });

    try {
      await sendMail(
        email,
        "🎉 Welcome to Talent Pool!",
        `<h2>Hello ${name},</h2>
         <p>Welcome to <strong>Talent Pool</strong>!</p>`
      );
      return res.status(201).json({
        message: "User registered successfully",
        token,
        role,
        emailSent: true,
      });
    } catch (mailErr) {
      return res.status(201).json({
        message: "User registered but email failed",
        token,
        role,
        emailSent: false,
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
  const isProd = process.env.NODE_ENV === "production";

  try {
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const users = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (users.length === 0)
      return res.status(400).json({ message: "Invalid email or password" });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = generateAccessToken({ email: user.email, role: user.role });
    const refreshToken = uuidv4();

    // store refresh token in DB
    await query("INSERT INTO refresh_tokens (token, email) VALUES (?, ?)", [refreshToken, email]);

    // Refresh Token Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,       // true on HTTPS
      sameSite: "None",     // allow cross-domain
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Access Token Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "None",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({
      message: "Login successful",
      token,   // optional
      role: user.role,
      name: user.name || email,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

// =================== REFRESH TOKEN ===================
authentication.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token found" });

  try {
    const rows = await query("SELECT * FROM refresh_tokens WHERE token = ?", [refreshToken]);
    if (rows.length === 0) return res.status(403).json({ message: "Invalid refresh token" });

    const userEmail = rows[0].email;
    const userRow = await query("SELECT email, role FROM authentication WHERE email = ?", [userEmail]);
    if (userRow.length === 0) return res.status(404).json({ message: "User not found" });

    const token = generateAccessToken({ email: userRow[0].email, role: userRow[0].role });
    res.status(200).json({ token });
  } catch (err) {
    console.error("❌ Refresh token error:", err);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

// =================== LOGOUT ===================
authentication.post("/logout", async (req, res) => {
  const { refreshToken } = req.cookies;
  try {
    if (refreshToken) await query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ Logout error:", err);
    return res.status(500).json({ message: "Logout failed" });
  }
});


// =================== ADMIN PROMOTE TO TUTOR ===================
authentication.put("/promote-tutor/:email", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { email } = req.params;
  const { course_id } = req.body;

  try {
    const result = await query("UPDATE authentication SET role = 'tutor' WHERE email = ?", [email]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });

    if (course_id) {
      await query(
        "INSERT INTO tutor_courses (tutor_email, course_id, assigned_at) VALUES (?, ?, ?)",
        [email, course_id, new Date()]
      );
    }

    await sendMail(
      email,
      "🎓 You have been promoted to Tutor!",
      `<h2>Congratulations!</h2>
       <p>Hello,</p>
       <p>You have been promoted to <strong>Tutor</strong> by the admin.</p>
       ${course_id ? `<p>You have been assigned to course ID: ${course_id}</p>` : ""}
       <p>Welcome to your new role and start mentoring your students!</p>
       <p>Best regards,<br/>Talent Pool Team</p>`
    );

    res.status(200).json({ message: "User promoted to tutor successfully and email sent" });
  } catch (err) {
    console.error("❌ Promote to tutor error:", err);
    res.status(500).json({ message: "Failed to promote user to tutor" });
  }
});

// =================== OTHER ROUTES (PROFILE, USERS, PASSWORD RESET, ETC.) ===================


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



export default authentication;
