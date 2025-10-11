import express from "express";
import axios from "axios";
import { query } from "./db.js";
import { verifyTokenOptional } from "./Auth/AuthenticationMiddleware.js"; // optional token
import nodemailer from "nodemailer";

const payment = express.Router();

// ================== MAILER UTILITY ==================
const sendAccountCreationEmail = async (toEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"TalentPool Academy" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Create Your Account",
      html: `
        <p>Hi,</p>
        <p>We've received your payment! ✅</p>
        <p>To access your course fully, please create an account using this email: <strong>${toEmail}</strong></p>
        <p><a href="${process.env.FRONTEND_URL}/signup?email=${toEmail}">Click here to create your account</a></p>
        <p>Regards,<br>TalentPool Academy Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending account creation email:", err);
  }
};

// ================= INITIATE PAYMENT =================
payment.post("/pay/:courseId", verifyTokenOptional, async (req, res) => {
  const { courseId } = req.params;
  const { half, email } = req.body;
  const user_email = req.user?.email || email;

  if (!user_email) return res.status(400).json({ message: "Email is required to make payment." });

  try {
    const courseRow = await query("SELECT * FROM CreateCourse WHERE id = ?", [courseId]);
    if (!courseRow.length) return res.status(404).json({ message: "Course not found" });

    const coursePrice = courseRow[0].price;
    const paymentAmount = half ? coursePrice / 2 : coursePrice;
    const amountInKobo = paymentAmount * 100;

    // Initialize Paystack transaction
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user_email,
        amount: amountInKobo,
        metadata: { courseId, half },
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" } }
    );

    const reference = paystackRes.data.data.reference;

    if (req.user) {
      // Logged-in user → Enrollments
      const existing = await query("SELECT * FROM Enrollments WHERE user_email=? AND course_id=?", [user_email, courseId]);
      if (!existing.length) {
        await query(
          "INSERT INTO Enrollments (user_email, course_id, paid, reference, amount_paid, half_payment_date) VALUES (?, ?, ?, ?, ?, ?)",
          [user_email, courseId, half ? 0 : 1, reference, paymentAmount, half ? new Date() : null]
        );
      } else {
        const prevAmount = existing[0].amount_paid || 0;
        const newAmountPaid = prevAmount + paymentAmount;
        const isPaid = newAmountPaid >= coursePrice ? 1 : 0;
        let halfPaymentDate = existing[0].half_payment_date;
        if (half && !halfPaymentDate) halfPaymentDate = new Date();

        await query(
          "UPDATE Enrollments SET reference=?, amount_paid=?, paid=?, half_payment_date=? WHERE user_email=? AND course_id=?",
          [reference, newAmountPaid, isPaid, halfPaymentDate, user_email, courseId]
        );
      }
    } else {
      // Guest → TempPayments
      await query(
        "INSERT INTO TempPayments (email, course_id, amount_paid, reference, half_payment_date, paid) VALUES (?, ?, ?, ?, ?, ?)",
        [user_email, courseId, paymentAmount, reference, half ? new Date() : null, half ? 0 : 1]
      );

      // Only send email to guest who is not registered yet
      const existingUser = await query("SELECT * FROM authentication WHERE email=?", [user_email]);

      if (!existingUser.length) {
        await sendAccountCreationEmail(user_email);
      }
    }

    res.json({ payment_url: paystackRes.data.data.authorization_url });
  } catch (err) {
    console.error("Payment Init Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to start payment" });
  }
});

// =============== GET ALL PAYMENTS (Admin only) ===============
payment.get("/paid-list", verifyTokenOptional, async (req, res) => {
  try {
    const paidUsers = await query(
      `SELECT e.id, e.user_email, e.course_id, e.amount_paid, e.paid, e.paid_at, c.title as course_title
       FROM Enrollments e
       JOIN CreateCourse c ON e.course_id = c.id
       WHERE e.amount_paid > 0
       ORDER BY e.paid_at DESC`
    );

    res.json(paidUsers);
  } catch (err) {
    console.error("Get Paid List Error:", err.message);
    res.status(500).json({ message: "Failed to fetch paid list" });
  }
});

// ================= VERIFY PAYMENT =================
payment.get("/verify/:reference", verifyTokenOptional, async (req, res) => {
  const reference = req.params.reference;
  const user_email = req.user?.email || req.query.email;

  if (!user_email) return res.status(400).json({ message: "Email is required." });

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const transactionData = response.data.data;
    if (transactionData.status !== "success") return res.status(400).json({ message: "Payment not successful." });

    // Check Enrollments first
    let record = await query("SELECT * FROM Enrollments WHERE reference=?", [reference]);
    let table = "Enrollments";

    if (!record.length) {
      record = await query("SELECT * FROM TempPayments WHERE reference=?", [reference]);
      table = "TempPayments";
    }

    if (!record.length) return res.status(404).json({ message: "Payment record not found." });

    const totalPaid = (record[0].amount_paid || 0) + transactionData.amount / 100;
    const course = await query("SELECT price FROM CreateCourse WHERE id=?", [record[0].course_id]);
    const coursePrice = course[0].price;
    const isPaid = totalPaid >= coursePrice ? 1 : 0;
    const remainingBalance = coursePrice - totalPaid;

    if (table === "Enrollments") {
      await query(
        "UPDATE Enrollments SET amount_paid=?, paid=?, paid_at=CASE WHEN ?=1 THEN NOW() ELSE paid_at END WHERE reference=?",
        [totalPaid, isPaid, isPaid, reference]
      );
    } else {
      await query(
        "UPDATE TempPayments SET amount_paid=?, paid=?, half_payment_date=CASE WHEN ?=1 THEN NOW() ELSE half_payment_date END WHERE reference=?",
        [totalPaid, isPaid, isPaid, reference]
      );

      // Send account creation email only if fully paid and guest has no account
      if (isPaid) {
        const existingUser = await query("SELECT * FROM authentication WHERE email=?", [user_email]);
        if (!existingUser.length) {
          await sendAccountCreationEmail(user_email);
        }
      }
    }

    res.json({ message: "Payment verified.", paid: isPaid, totalPaid, remainingBalance });
  } catch (err) {
    console.error("Payment Verify Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed." });
  }
});

export default payment;
