import express from "express";  
import axios from "axios";
import { query } from "./db.js";
import { verifyToken } from "./AuthenticationRoute.js";

const payment = express.Router();

// =============== INITIATE PAYMENT ===============
payment.post("/pay/:courseId", verifyToken, async (req, res) => {
  const { courseId } = req.params;
  const { half } = req.body; // { half: true } for half payment
  const user_email = req.user.email;

  if (!user_email) {
    return res.status(401).json({ message: "Authentication failed. User email is missing." });
  }

  try {
    // Fetch course
    const course = await query("SELECT * FROM CreateCourse WHERE id = ?", [courseId]);
    if (!course.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const coursePrice = course[0].price;
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
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reference = paystackRes.data.data.reference;

    // Check if enrollment exists
    const existing = await query(
      "SELECT * FROM Enrollments WHERE user_email=? AND course_id=?",
      [user_email, courseId]
    );

    if (!existing.length) {
      // Insert new enrollment with half_payment_date if half payment
      await query(
        "INSERT INTO Enrollments (user_email, course_id, paid, reference, amount_paid, half_payment_date) VALUES (?, ?, ?, ?, ?, ?)",
        [user_email, courseId, 0, reference, paymentAmount, half ? new Date() : null]
      );
    } else {
      // Only allow second payment if 2 months passed
      if (half && existing[0].half_payment_date) {
        const twoMonthsLater = new Date(existing[0].half_payment_date);
        twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
        const now = new Date();
        if (now < twoMonthsLater) {
          return res.status(403).json({ message: "You can pay the remaining amount after 2 months from your first payment." });
        }
      }

      // Update reference and amount_paid
      const newAmountPaid = (existing[0].amount_paid || 0) + paymentAmount;
      const isPaid = newAmountPaid >= coursePrice ? 1 : 0;

      await query(
        "UPDATE Enrollments SET reference=?, amount_paid=?, paid=? WHERE user_email=? AND course_id=?",
        [reference, newAmountPaid, isPaid, user_email, courseId]
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

  if (!user_email) {
    return res.status(401).json({ message: "Authentication failed. User email is missing." });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const transactionData = response.data.data;
    if (transactionData.status !== "success") {
      return res.status(400).json({ message: "Payment was not successful. Status: " + transactionData.status });
    }

    // Find enrollment by reference
    const enrollment = await query("SELECT * FROM Enrollments WHERE reference=?", [reference]);

    if (!enrollment.length) {
      return res.status(404).json({ message: "Enrollment not found for this reference." });
    }

    const enrollmentRecord = enrollment[0];
    if (enrollmentRecord.user_email !== user_email) {
      console.warn(`Security alert: User ${user_email} attempted to verify payment for ${enrollmentRecord.user_email}`);
      return res.status(403).json({ message: "You are not authorized to verify this payment." });
    }

    const course = await query("SELECT price FROM CreateCourse WHERE id=?", [enrollmentRecord.course_id]);
    if (!course.length) {
      return res.status(404).json({ message: "Associated course not found." });
    }

    const coursePrice = course[0].price;
    const amountFromPaystack = transactionData.amount / 100;

    // Update enrollment
    const totalPaid = (enrollmentRecord.amount_paid || 0) + amountFromPaystack;
    const isPaid = totalPaid >= coursePrice ? 1 : 0;

    await query(
      "UPDATE Enrollments SET paid=?, paid_at=NOW(), amount_paid=? WHERE reference=?",
      [isPaid, totalPaid, reference]
    );

    return res.json({ message: "Payment verified and enrollment updated.", paid: isPaid });
  } catch (err) {
    console.error("Payment Verify Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed. An unexpected error occurred." });
  }
});

// =============== GET ALL PAYMENTS (Admin only) ===============
payment.get("/paid-list", verifyToken, async (req, res) => {
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

// Get courses enrolled by logged-in user
payment.get("/my-courses", verifyToken, async (req, res) => {
  const user_email = req.user.email;

  try {
    const enrolledCourses = await query(
      `SELECT e.course_id, e.amount_paid, e.paid, e.half_payment_date, c.title, c.price, c.image_url
       FROM Enrollments e
       JOIN CreateCourse c ON e.course_id = c.id
       WHERE e.user_email = ?
       ORDER BY e.paid_at DESC`,
      [user_email]
    );

    res.json(enrolledCourses);
  } catch (err) {
    console.error("Fetch My Courses Error:", err.message);
    res.status(500).json({ message: "Failed to fetch your courses." });
  }
});





export default payment;
