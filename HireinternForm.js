import express from "express";
import db from "./db.js";

const router = express.Router();

// Convert empty strings to null for SQL
const toNullIfEmpty = (value) => (value === "" ? null : value);

// Date format validator (YYYY-MM-DD)
const isValidDate = (dateString) => {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d);
};

router.post("/register", async (req, res) => {
  try {
    console.log("📥 Received registration data:", req.body);

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

    // Check for missing required fields
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

    // ✅ Convert optional fields to null if empty
    experience = toNullIfEmpty(experience);
    linked_in = toNullIfEmpty(linked_in);

    // ✅ Validate date
    if (!isValidDate(dob)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    // ✅ Parse experience to integer if provided
    let expValue = null;
    if (experience !== null) {
      expValue = parseInt(experience, 10);
      if (isNaN(expValue)) {
        return res.status(400).json({
          success: false,
          message: "Experience must be a number",
        });
      }
    }

    // ✅ Insert into MySQL
    const [insertResult] = await db.query(
      `INSERT INTO registertalent 
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

    if (insertResult.affectedRows === 1) {
      console.log("✅ Data inserted with ID:", insertResult.insertId);
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


router.post("/SubmitInternship", (req, res) => {
  const { companyName, email, description, amount, salaryRange } = req.body;

  // Basic validation
  if (!companyName || !email || !description || !amount || !salaryRange) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `
    INSERT INTO internships (companyName, email, description, amount, salaryRange)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [companyName, email, description, amount, salaryRange],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to submit internship request" });
      }
      res.status(201).json({ message: "Internship request submitted successfully" });
    }
  );
});


export default router;
