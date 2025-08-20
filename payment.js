// payment.js
import express from "express";
import axios from "axios";
import { query } from "./db.js";
import { verifyToken } from "./AuthenticationRoute.js";

const payment = express.Router();

// =============== INITIATE PAYMENT ===============
payment.post("/pay/:courseId", verifyToken, async (req, res) => {
  const { courseId } = req.params;
  const user_email = req.user.email;

  try {
    const course = await query("SELECT * FROM CreateCourse WHERE id = ?", [courseId]);
    if (course.length === 0) return res.status(404).json({ message: "Course not found" });

    const amount = course[0].price * 100; // kobo for Paystack

    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user_email,
        amount,
        metadata: { courseId },
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // ✅ Save enrollment as pending if not exists
    const existing = await query(
      "SELECT * FROM Enrollments WHERE user_email=? AND course_id=?",
      [user_email, courseId]
    );

    if (!existing.length) {
      await query(
        "INSERT INTO Enrollments (user_email, course_id, paid, reference) VALUES (?, ?, ?, ?)",
        [user_email, courseId, 0, paystackRes.data.data.reference]
      );
    } else {
      // Update reference if pending
      await query(
        "UPDATE Enrollments SET reference=? WHERE user_email=? AND course_id=?",
        [paystackRes.data.data.reference, user_email, courseId]
      );
    }

    res.json({ payment_url: paystackRes.data.data.authorization_url });
  } catch (err) {
    console.error("Payment Init Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to start payment" });
  }
});

// =============== VERIFY PAYMENT ===============
payment.get("/verify/:reference", verifyToken, async (req, res) => {
  const { reference } = req.params;
  const user_email = req.user.email;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (response.data.data.status === "success") {
      // ✅ Mark enrollment as paid
      await query(
        "UPDATE Enrollments SET paid = 1, paid_at = NOW() WHERE reference=? AND user_email=?",
        [reference, user_email]
      );

      return res.json({ message: "Payment verified and enrollment confirmed" });
    }

    res.status(400).json({ message: "Payment not successful" });
  } catch (err) {
    console.error("Payment Verify Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

export default payment;
