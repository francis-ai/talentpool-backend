import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";
import { sendMail } from "./authen.util.js";
import { JWT_SECRET, adminEmails, FRONTEND_URL } from "./auth.constants.js";


// =================== JWT Helper ===================
const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

// =================== REGISTER ===================
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const existing = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = adminEmails.includes(email) ? "admin" : "student";

    await query(
      "INSERT INTO authentication (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    const token = generateAccessToken({ email, role, name });

    try {
      const info = await sendMail(
        email,
        "🎉 Welcome to Talent Pool!",
        `<h2>Hello ${name},</h2>
         <p>Welcome to <strong>Talent Pool</strong>! We’re thrilled to have you on board.</p>`
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
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

// =================== LOGIN ===================
 export const  loginUser = async (req, res) => {
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

    // ✅ Fix cookie settings for localhost and production
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // lax on localhost
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

// =================== REFRESH TOKEN ===================
 export const refreshToken = async (req, res) => {
 const { refreshToken } = req.cookies || {};
if (!refreshToken) {
  return res.status(401).json({ message: "No refresh token found" });
}

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
}

// =================== LOGOUT ===================
export const logoutUser = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (!refreshToken) return res.status(400).json({ message: "No refresh token found" });

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
};

// =================== FORGOT PASSWORD ===================
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const users = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "Email not found" });

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await query("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)", [email, resetToken, expiresAt]);

    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;
    await sendMail(
      email,
      "🔑 Reset your password",
      `<p>Hello, ${email}</p>
       <p>You requested a password reset. Click below:</p>
       <p><a href="${resetLink}">Reset Password</a></p>
       <p>Link expires in 1 hour.</p>`
    );

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    return res.status(500).json({ message: "Failed to send password reset email" });
  }
};

// =================== RESET PASSWORD ===================
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ message: "New password is required" });

  try {
    const rows = await query("SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()", [token]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

    const email = rows[0].email;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query("UPDATE authentication SET password = ? WHERE email = ?", [hashedPassword, email]);
    await query("DELETE FROM password_resets WHERE token = ?", [token]);

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

// =================== PROFILE ===================
export const profile = async (req, res) => {
  try {
    const email = req.user.email;
    const users = await query("SELECT name, email, role FROM authentication WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(users[0]);
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// =================== UPDATE PASSWORD ===================
export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both current and new password are required" });

  try {
    const email = req.user.email;
    const users = await query("SELECT * FROM authentication WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query("UPDATE authentication SET password = ? WHERE email = ?", [hashedPassword, email]);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Update password error:", err);
    return res.status(500).json({ message: "Failed to update password" });
  }
};

// =================== PROMOTE TUTOR ===================
export const promoteTutor = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { email } = req.params;
  const { course_id } = req.body;

  try {
    const result = await query("UPDATE authentication SET role = 'tutor' WHERE email = ?", [email]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });

    if (course_id) {
      await query("INSERT INTO tutor_courses (tutor_email, course_id, assigned_at) VALUES (?, ?, ?)", [email, course_id, new Date()]);
    }

    await sendMail(
      email,
      "🎓 You have been promoted to Tutor!",
      `<h2>Congratulations!</h2>
       <p>Hello,</p>
       <p>You have been promoted to <strong>Tutor</strong> by the admin.</p>
       ${course_id ? `<p>Assigned to course ID: ${course_id}</p>` : ""}
       <p>Welcome to your new role!</p>
       <p>Best regards,<br/>Talent Pool Team</p>`
    );

    return res.status(200).json({ message: "User promoted to tutor successfully and email sent" });
  } catch (err) {
    console.error("❌ Promote to tutor error:", err);
    return res.status(500).json({ message: "Failed to promote user to tutor" });
  }
};
