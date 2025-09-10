import express from "express";
import db from "./db.js";

const router = express.Router();




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
