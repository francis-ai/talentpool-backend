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

payment.get("/my-courses", verifyTokenOptional, async (req, res) => {
  const user_email = req.user.email;

  try {
    const enrolledCourses = await query(
      `SELECT 
          e.course_id, 
          e.amount_paid, 
          e.paid, 
          e.is_paid_full, 
          e.next_payment_due,
          c.title, 
          c.price, 
          c.image_url
       FROM Enrollments e
       JOIN CreateCourse c ON e.course_id = c.id
       WHERE e.user_email = ?
       ORDER BY e.paid_at DESC`,
      [user_email]
    );

    const formattedCourses = enrolledCourses.map((course) => {
      let paymentStatus = "not_enrolled";
      let countdown = null;
      let daysLeft = null;

      if (course.is_paid_full === 1) {
        paymentStatus = "fully_paid";
      } else if (course.paid === 1 && course.is_paid_full === 0) {
        paymentStatus = "half_paid";
        countdown = course.next_payment_due;

        // 🧮 Calculate remaining days
        if (course.next_payment_due) {
          const dueDate = new Date(course.next_payment_due);
          const now = new Date();
          const diffTime = dueDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // convert ms → days
        }
      }

      return {
        course_id: course.course_id,
        title: course.title,
        price: course.price,
        image_url: course.image_url,
        amount_paid: course.amount_paid,
        paymentStatus,
        countdown,
        daysLeft: daysLeft > 0 ? daysLeft : 0, // ensure no negative numbers
      };
    });

    res.json(formattedCourses);
  } catch (err) {
    console.error("Fetch My Courses Error:", err.message);
    res.status(500).json({ message: "Failed to fetch your courses." });
  }
});


// ================= INITIATE PAYMENT =================
payment.post("/pay/:courseId", verifyTokenOptional, async (req, res) => {
  const { courseId } = req.params;
  const { half, email } = req.body;
  const user_email = req.user?.email || email;

  if (!user_email)
    return res.status(400).json({ message: "Email is required to make payment." });

  try {
    const courseRow = await query("SELECT * FROM CreateCourse WHERE id = ?", [courseId]);
    if (!courseRow.length)
      return res.status(404).json({ message: "Course not found" });

    const coursePrice = courseRow[0].price;
    const paymentAmount = half ? coursePrice / 2 : coursePrice;
    const amountInKobo = paymentAmount * 100;

    // ✅ Initialize Paystack transaction
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user_email,
        amount: amountInKobo,
        metadata: { courseId, half },
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    // 🚫 Don't save anything yet (only save after verify)
    res.json({ payment_url: paystackRes.data.data.authorization_url });
  } catch (err) {
    console.error("Payment Init Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to start payment" });
  }
});

// ================= VERIFY PAYMENT =================
payment.get("/verify/:reference", verifyTokenOptional, async (req, res) => {
  const { reference } = req.params;
  const user_email = req.user?.email || req.query.email;

  if (!user_email)
    return res.status(400).json({ message: "Email is required." });

  try {
    // ✅ Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const data = response.data.data;
    if (data.status !== "success") {
      return res.status(400).json({ message: "Payment not successful." });
    }

    const { courseId, half } = data.metadata;
    const course = await query("SELECT price FROM CreateCourse WHERE id=?", [courseId]);
    if (!course.length) {
      return res.status(404).json({ message: "Course not found." });
    }

    const coursePrice = course[0].price;
    const amountPaid = data.amount / 100;

    const existing = await query(
      "SELECT * FROM Enrollments WHERE user_email=? AND course_id=?",
      [user_email, courseId]
    );

    if (!existing.length) {
      // 🆕 First payment
      const isHalfPayment = half && amountPaid < coursePrice;
      const paid = 1; // user has paid something
      const is_paid_full = isHalfPayment ? 0 : 1;
      const is_paid_full_date = isHalfPayment ? null : new Date();

      await query(
        `INSERT INTO Enrollments 
         (user_email, course_id, paid, is_paid_full, is_paid_full_date, reference, amount_paid, half_payment_date, next_payment_due, paid_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_email,
          courseId,
          paid,
          is_paid_full,
          is_paid_full_date,
          reference,
          amountPaid,
          isHalfPayment ? new Date() : null,
          isHalfPayment
            ? new Date(new Date().setMonth(new Date().getMonth() + 1))
            : null,
          new Date(), // record paid_at for successful payment
        ]
      );
    } else {
      // 🧾 Update existing record
      const previous = existing[0];
      const totalPaid = previous.amount_paid + amountPaid;
      const fullyPaid = totalPaid >= coursePrice;

      await query(
        `UPDATE Enrollments 
         SET amount_paid=?, 
             paid=1,
             is_paid_full=?, 
             is_paid_full_date = CASE WHEN ? = 1 THEN NOW() ELSE is_paid_full_date END,
             reference=?, 
             paid_at = NOW(),
             next_payment_due = CASE WHEN ? = 1 THEN NULL ELSE next_payment_due END
         WHERE user_email=? AND course_id=?`,
        [
          totalPaid,
          fullyPaid ? 1 : 0,
          fullyPaid ? 1 : 0,
          reference,
          fullyPaid ? 1 : 0,
          user_email,
          courseId,
        ]
      );

      // ⏳ If half payment just made, set the countdown period
      if (half && !previous.half_payment_date) {
        await query(
          "UPDATE Enrollments SET half_payment_date=?, next_payment_due=? WHERE user_email=? AND course_id=?",
          [
            new Date(),
            new Date(new Date().setMonth(new Date().getMonth() + 1)),
            user_email,
            courseId,
          ]
        );
      }
    }

    res.json({ message: "✅ Payment verified and recorded successfully." });
  } catch (err) {
    console.error("Payment Verify Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed." });
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


export default payment;
