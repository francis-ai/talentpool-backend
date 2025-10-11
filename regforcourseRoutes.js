import express from "express";
import { query } from "./db.js";
import { verifyToken } from "./Auth/AuthenticationMiddleware.js";
import nodemailer from "nodemailer";
import axios from "axios";

const router = express.Router();

// ================= MAILER CONFIG =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  return transporter.sendMail({
    from: `"TalentPool Academy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// ================= HELPERS =================
const toNullIfEmpty = (value) => (value === "" ? null : value);

const isValidDate = (dateString) => {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d);
};

// ================= REGISTER FOR COURSE =================
router.post("/registercourse", async (req, res) => {
  try {
    const requiredFields = [
      "course",
      "full_name",
      "email",
      "phone",
      "dob",
      "address",
      "city",
      "qualification",
      "schedule",
      "duration",
    ];

    const {
      course,
      full_name,
      email,
      phone,
      dob,
      address,
      city,
      qualification,
      experience,
      linked_in,
      schedule,
      duration,
    } = req.body;

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const expValue = experience ? parseInt(experience, 10) : null;
    if (experience && isNaN(expValue)) {
      return res.status(400).json({ success: false, message: "Experience must be a number" });
    }

    if (!isValidDate(dob)) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
    }

    // Fetch course info
    const courseRow = await query("SELECT title, price FROM CreateCourse WHERE id = ?", [course]);
    if (!courseRow.length) return res.status(404).json({ success: false, message: "Course not found" });

    const courseTitle = courseRow[0].title;
    const coursePrice = courseRow[0].price;

    // Insert registration into DB
    const insertResult = await query(
      `INSERT INTO regforcourse
      (course, full_name, email, phone, dob, address, city, qualification, experience, linked_in, schedule, duration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [course, full_name, email, phone, dob, address, city, qualification, expValue, linked_in || null, schedule, duration]
    );

    if (insertResult.affectedRows === 0) throw new Error("No rows were inserted");

    // ===================== INITIATE PAYSTACK PAYMENT =====================
    const amountInKobo = coursePrice * 100;
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amountInKobo,
        metadata: { courseId: course },
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" } }
    );

    const paymentUrl = paystackRes.data.data.authorization_url;

    // ===================== SEND REGISTRATION EMAIL =====================
    await sendMail(
      email,
      "🎉 Course Registration Successful - TalentPool Academy",
      `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; background: #f5f7fa; margin:0; padding:20px; }
              .email-container { max-width:600px; margin:0 auto; background:white; border-radius:15px; overflow:hidden; box-shadow:0 5px 20px rgba(0,0,0,0.1);}
              .header { background: linear-gradient(135deg,#007bff,#0056b3); padding:30px; text-align:center; color:white;}
              .content { padding:30px; }
              .greeting { color:#2c3e50; font-size:24px; margin-bottom:10px; }
              .success-badge { background:#28a745; color:white; padding:8px 16px; border-radius:20px; display:inline-block; margin:15px 0; font-weight:bold;}
              .course-info { background:#f8f9fa; border-left:4px solid #007bff; padding:20px; margin:20px 0; border-radius:0 8px 8px 0; }
              .cta-button { display:inline-block; background:linear-gradient(135deg,#007bff,#0056b3); color:white; text-decoration:none; padding:14px 30px; border-radius:8px; font-weight:bold; margin:20px 0; transition:0.3s;}
              .cta-button:hover { transform:translateY(-2px); box-shadow:0 5px 15px rgba(0,123,255,0.4); }
              .footer { text-align:center; padding:20px; background:#f8f9fa; color:#6c757d; font-size:14px;}
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <h1 style="margin:0; font-size:28px;">TalentPool Academy</h1>
                  <p style="margin:5px 0 0 0; opacity:0.9;">Unlock Your Potential</p>
              </div>
              <div class="content">
                  <h2 class="greeting">Hello ${full_name},</h2>
                  <div class="success-badge">✓ Registration Successful!</div>
                  <p>Thank you for choosing <strong>TalentPool Academy</strong>! We're excited to have you on board.</p>
                  <div class="course-info">
                      <h3 style="margin-top:0; color:#007bff;">Course Details</h3>
                      <p><strong>Course:</strong> ${courseTitle}</p>
                      <p><strong>Price:</strong> ₦${coursePrice}</p>
                      <p><strong>Schedule:</strong> ${schedule}</p>
                      <p><strong>Duration:</strong> ${duration}</p>
                  </div>
                  <p>Click the button below to proceed to payment for your selected course:</p>
                  <a href="${paymentUrl}" class="cta-button">Proceed to Payment →</a>
                  <p>If you have any questions, feel free to reply to this email.</p>
              </div>
              <div class="footer">
                  <p><strong>TalentPool Academy</strong></p>
                  <p>Email: ${process.env.EMAIL_USER}</p>
                  <p>Best regards,<br>The TalentPool Academy Team</p>
              </div>
          </div>
      </body>
      </html>
      `
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful. Email sent with payment link.",
      registrationId: insertResult.insertId,
      payment_url: paymentUrl,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: err.message,
    });
  }
});

// ================= VERIFY PAYMENT & HANDLE GUESTS =================
router.get("/verify-payment/:reference", async (req, res) => {
  const reference = req.params.reference;
  try {
    const paystackRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const transaction = paystackRes.data.data;
    if (transaction.status !== "success")
      return res.status(400).json({ success: false, message: "Payment not successful." });

    const email = transaction.customer.email;
    const courseId = transaction.metadata.courseId;

    // First try regforcourse
    let updateRes = await query(
      "UPDATE regforcourse SET paid = 1, paid_at = NOW() WHERE email = ? AND course = ?",
      [email, courseId]
    );

    if (updateRes.affectedRows > 0) {
      // ✅ Registered student → send confirmation mail
      await sendMail(
        email,
        "🎉 Payment Verified - Course Access Granted",
        `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Hello,</p>
          <p>Your payment for the course has been verified successfully! ✅</p>
          <p>You now have full access to your course.</p>
          <p>Thank you for choosing <strong>TalentPool Academy</strong>!</p>
          <p>— TalentPool Academy Team</p>
        </body>
        </html>
        `
      );
    } else {
      // Otherwise try TempPayments (guest)
      updateRes = await query(
        "UPDATE TempPayments SET paid = 1, paid_at = NOW() WHERE email = ? AND course_id = ?",
        [email, courseId]
      );

      if (updateRes.affectedRows === 0)
        return res.status(404).json({ success: false, message: "Payment record not found." });

      // ✅ Guest → send registration email
      await sendMail(
        email,
        "🎉 Payment Verified - Complete Your Registration",
        `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Hello,</p>
          <p>We've received your payment successfully! ✅</p>
          <p>To access your course fully, please <a href="${process.env.FRONTEND_URL}/register?email=${email}">create an account</a> using this email.</p>
          <p>Thank you for choosing <strong>TalentPool Academy</strong>!</p>
          <p>— TalentPool Academy Team</p>
        </body>
        </html>
        `
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified. Course access granted.",
      courseId,
      email,
    });
  } catch (err) {
    console.error("❌ Payment verification error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.message,
    });
  }
});

// ================= GET ALL REGISTRATIONS (ADMIN ONLY) =================
router.get("/all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied. Admins only." });

    const rows = await query("SELECT * FROM regforcourse ORDER BY created_at DESC");
    res.status(200).json({ totalRegistrations: rows.length, registrations: rows });
  } catch (err) {
    console.error("❌ Error fetching registrations:", err);
    res.status(500).json({ message: "Failed to fetch registrations", error: err.message });
  }
});

export default router;
