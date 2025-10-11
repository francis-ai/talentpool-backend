import { query } from "../db.js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ======== Mailer =============

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

// =================== PLANS ===================

// Get all plans
export const getPlans = async (req, res) => {
  try {
    const plans = await query("SELECT * FROM subscription_plans");
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching plans" });
  }
};

// Create a new plan
export const createPlan = async (req, res) => {
  const { name, price, duration_days, features } = req.body;
  try {
    await query(
      "INSERT INTO subscription_plans (name, price, duration_days, features) VALUES (?, ?, ?, ?)",
      [name, price, duration_days, JSON.stringify(features)]
    );
    res.status(201).json({ message: "Plan created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating plan" });
  }
};

// Update plan
export const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { name, price, duration_days, features } = req.body;
  try {
    await query(
      "UPDATE subscription_plans SET name=?, price=?, duration_days=?, features=? WHERE id=?",
      [name, price, duration_days, JSON.stringify(features), id]
    );
    res.json({ message: "Plan updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating plan" });
  }
};

// Delete plan
export const deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM subscription_plans WHERE id=?", [id]);
    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting plan" });
  }
};

// =================== SUBSCRIPTIONS ===================

// Admin view all user subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const subs = await query(
      `SELECT us.id, u.name as user_name, sp.name as plan_name, us.start_date, us.end_date, us.status, us.user_email
       FROM user_subscriptions us
       JOIN authentication u ON us.user_email = u.email
       JOIN subscription_plans sp ON us.plan_id = sp.id`
    );

    res.json(subs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching subscriptions" });
  }
};


// ============ Subscribe to plan ============================

// ==========================
// Subscribe Controller
// ==========================
export const subscribeToPlan = async (req, res) => {
  const { planId } = req.params;
  const { user_email } = req.body; // ✅ frontend passes email

  if (!user_email) {
    return res.status(400).json({ message: "User email missing." });
  }

  try {
    // ✅ Get plan from DB
    const planRow = await query("SELECT * FROM subscription_plans WHERE id = ?", [planId]);
    if (!planRow.length) return res.status(404).json({ message: "Plan not found" });

    const plan = planRow[0];
    const amountInKobo = plan.price * 100;

    // ✅ Initialize Paystack transaction
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user_email,
        amount: amountInKobo,
        metadata: { planId, user_email },
        callback_url: `${process.env.FRONTEND_URL}/subscription-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reference = paystackRes.data.data.reference;

    // ✅ Insert payment record with user_email instead of user_id
    await query(
      "INSERT INTO subscription_payments (user_email, plan_id, reference, amount, status) VALUES (?, ?, ?, ?, ?)",
      [user_email, planId, reference, plan.price, "pending"]
    );

    res.json({ payment_url: paystackRes.data.data.authorization_url });
  } catch (err) {
    console.error("Subscription Payment Init Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to start subscription payment" });
  }
};

// ==========================
// Paystack Webhook Handler
// ==========================
export const handlePaystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, metadata, customer } = event.data;
      const planId = metadata.planId;
      const user_email = customer.email;

      // ✅ Update subscription_payments status → success by email
      await query(
        "UPDATE subscription_payments SET status=? WHERE reference=? AND user_email=?",
        ["success", reference, user_email]
      );

      // ✅ Get user_id from authentication (if needed for user_subscriptions)
      const [user] = await query("SELECT * FROM authentication WHERE email=?", [user_email]);

      if (!user) {
        await sendAccountCreationEmail(user_email); // optional guest signup
        return res.sendStatus(200);
      }

      const userId = user.id;

      // ✅ Get plan duration
      const [plan] = await query("SELECT * FROM subscription_plans WHERE id=?", [planId]);
      if (!plan) return res.sendStatus(200);

      const durationDays = plan.duration_days;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + durationDays);

      // ✅ Insert or update user_subscriptions
      const existing = await query(
        "SELECT * FROM user_subscriptions WHERE user_email=? AND status='active'",
        [user_email]
      );

      if (!existing.length) {
        await query(
          "INSERT INTO user_subscriptions (user_email, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)",
          [user_email, planId, startDate, endDate, "active"]
        );
      } else {
        // Renewal → extend end_date
        const currentEnd = new Date(existing[0].end_date);
        const newEndDate = new Date(currentEnd > startDate ? currentEnd : startDate);
        newEndDate.setDate(newEndDate.getDate() + durationDays);

        await query(
          "UPDATE user_subscriptions SET end_date=?, plan_id=? WHERE id=?",
          [newEndDate, planId, existing[0].id]
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
};


export const getPaymentInfo = async (req, res) => {
  try {
    const { reference } = req.params;
    const { email } = req.query; // optional, frontend may pass user email

    if (!reference) {
      return res.status(400).json({ message: "Reference is required." });
    }

    // Fetch payment record with plan and subscription info
    const [payment] = await query(
      `SELECT 
         sp.reference,
         sp.amount,
         sp.status AS payment_status,
         sp.user_email,
         p.name AS plan_name,
         p.price,
         p.duration_days,
         p.features,
         us.start_date,
         us.end_date,
         us.status AS subscription_status
       FROM subscription_payments sp
       LEFT JOIN subscription_plans p ON sp.plan_id = p.id
       LEFT JOIN user_subscriptions us ON sp.user_email = us.user_email AND sp.plan_id = us.plan_id
       WHERE sp.reference = ? ${email ? "AND sp.user_email = ?" : ""}`,
      email ? [reference, email] : [reference]
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    // Parse features JSON
    const features = payment.features ? JSON.parse(payment.features) : [];

    console.log("User subscribed plan:", payment.plan_name, "Amount:", payment.amount);

    res.json({
      plan_name: payment.plan_name,
      amount: payment.amount,
      duration_days: payment.duration_days,
      features: features,
      status: payment.subscription_status || payment.payment_status,
      start_date: payment.start_date,
      end_date: payment.end_date,
      user_email: payment.user_email,
    });
  } catch (err) {
    console.error("Error fetching payment info:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// GET /api/user/lessons
export const getLessons = async (req, res) => {
  try {
    const lessons = await query(
      "SELECT id, title, video_url, module_id FROM CreateLessons ORDER BY id ASC"
    );

    res.json(lessons); // return lessons
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).json({ message: "Failed to fetch lessons" });
  }
};

export const getUserLessonsWithAccess = async (req, res) => {
  try {
    const userEmail = req.query.email; // from frontend
    if (!userEmail) return res.status(400).json({ message: "User email required" });

    // Check active subscription
    const [subscription] = await query(
      "SELECT * FROM user_subscriptions WHERE user_email=? AND status='active'",
      [userEmail]
    );

    const hasActive = subscription && new Date(subscription.end_date) >= new Date();

    // Fetch all lessons
    const lessons = await query(
      "SELECT id, title, video_url, module_id FROM CreateLessons ORDER BY id ASC"
    );

    // Map access based on subscription
    const lessonsWithAccess = lessons.map((lesson) => ({
      ...lesson,
      access: hasActive, // true or false
    }));

    res.json({ lessons: lessonsWithAccess, hasActive });
  } catch (err) {
    console.error("Error fetching lessons with access:", err);
    res.status(500).json({ message: "Server error" });
  }
};