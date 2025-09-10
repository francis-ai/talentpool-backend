import express from "express"; 
import db, { query } from "./db.js";
import { verifyToken } from "./AuthenticationRoute.js"; // JWT middleware

const router = express.Router();

// Helper to convert empty strings to null
const toNullIfEmpty = (value) => (value === "" ? null : value);

// Validate date format YYYY-MM-DD
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

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    let {
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

    // Optional fields
    experience = toNullIfEmpty(experience);
    linked_in = toNullIfEmpty(linked_in);

    if (!isValidDate(dob)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const expValue = experience !== null ? parseInt(experience, 10) : null;
    if (experience !== null && isNaN(expValue)) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a number",
      });
    }

    // Insert into regforcourse table
    const insertResult = await query(
      `INSERT INTO regforcourse 
        (course, full_name, email, phone, dob, address, city, qualification, experience, linked_in, schedule, duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        course,
        full_name,
        email,
        phone,
        dob,
        address,
        city,
        qualification,
        expValue,
        linked_in,
        schedule,
        duration,
      ]
    );

    if (insertResult.affectedRows > 0) {
      return res.status(201).json({
        success: true,
        message: "Registration successful",
        registrationId: insertResult.insertId,
      });
    } else {
      throw new Error("No rows were inserted");
    }
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: err.message,
    });
  }
});

// ================= GET ALL REGISTRATIONS (ADMIN ONLY) =================
router.get("/all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const rows = await query("SELECT * FROM regforcourse ORDER BY created_at DESC");

    res.status(200).json({
      totalRegistrations: rows.length,
      registrations: rows,
    });
  } catch (err) {
    console.error("❌ Error fetching registrations:", err);
    res.status(500).json({ message: "Failed to fetch registrations", error: err.message });
  }
});

export default router;
