import express from "express";
import { query } from "./db.js";
import { verifyToken } from "./AuthenticationRoute.js";
import nodemailer from "nodemailer";

const Talents = express.Router();

// 📩 Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // your app password
  },
});

Talents.post("/talent", async (req, res) => {
  try {
    console.log("📩 Received body:", req.body);

    const formData = req.body.formData || req.body;
    const educations = req.body.educations || [];
    const projects = req.body.projects || [];

    if (!formData.fullName || !formData.email) {
      return res.status(400).json({
        success: false,
        error: "❌ fullName and email are required",
      });
    }

    // Insert into talents table
    const result = await query(
      `INSERT INTO talents 
        (fullName, jobTitle, location, experience, profileUrl, bio, email, phone, linkedin, portfolio, github, website, expectedSalary, available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formData.fullName || "",
        formData.jobTitle || "",
        formData.location || "",
        formData.experience || 0,
        formData.profileUrl || "",
        formData.bio || "",
        formData.email || "",
        formData.phone || "",
        formData.linkedin || "",
        formData.portfolio || "",
        formData.github || "",
        formData.website || "",
        formData.expectedSalary || "",
        formData.available ? 1 : 0,
      ]
    );

    const talentId = result.insertId;

    // Insert skills
    if (Array.isArray(formData.skills) && formData.skills.length) {
      for (const skill of formData.skills) {
        await query(`INSERT INTO skills (talent_id, skill) VALUES (?, ?)`, [
          talentId,
          skill,
        ]);
      }
    }

    // Insert jobTypes
    if (Array.isArray(formData.jobTypes) && formData.jobTypes.length) {
      for (const jobType of formData.jobTypes) {
        await query(
          `INSERT INTO job_types (talent_id, jobType) VALUES (?, ?)`,
          [talentId, jobType]
        );
      }
    }

    // Insert educations
    if (Array.isArray(educations) && educations.length) {
      for (const edu of educations) {
        await query(
          `INSERT INTO educations (talent_id, degree, institution, field, year) VALUES (?, ?, ?, ?, ?)`,
          [
            talentId,
            edu.degree || "",
            edu.institution || "",
            edu.field || "",
            edu.year || "",
          ]
        );
      }
    }

    // Insert projects
    if (Array.isArray(projects) && projects.length) {
      for (const proj of projects) {
        await query(
          `INSERT INTO projects (talent_id, name, year, projectUrl, githubUrl, description, tech)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            talentId,
            proj.name || "",
            proj.year || "",
            proj.projectUrl || "",
            proj.githubUrl || "",
            proj.description || "",
            proj.tech || "",
          ]
        );
      }
    }

    // 1️⃣ Send confirmation email to the talent
    await transporter.sendMail({
      from: `"Talent Pool" <${process.env.EMAIL_USER}>`,
      to: formData.email,
      subject: "✅ Talent Profile Submitted Successfully",
      html: `
        <h2>Hi ${formData.fullName},</h2>
        <p>🎉 Thank you for submitting your talent profile to our platform.</p>
        <p>Our team will review your details and reach out if there’s a suitable opportunity.</p>
        <br/>
        <p>Best regards,<br/>Talent Pool Team</p>
      `,
    });

    // 2️⃣ Send all information to admin
    await transporter.sendMail({
      from: `"Talent Pool" <${process.env.EMAIL_USER}>`,
      to: "tosinogungbe706@gmail.com",
      subject: `🆕 New Talent Submission: ${formData.fullName}`,
      html: `
        <h2>New Talent Profile Submitted</h2>
        <p><strong>Full Name:</strong> ${formData.fullName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone || "N/A"}</p>
        <p><strong>Job Title:</strong> ${formData.jobTitle || "N/A"}</p>
        <p><strong>Location:</strong> ${formData.location || "N/A"}</p>
        <p><strong>Experience:</strong> ${formData.experience || "N/A"} years</p>
        <p><strong>Skills:</strong> ${Array.isArray(formData.skills) ? formData.skills.join(", ") : "N/A"}</p>
        <p><strong>Job Types:</strong> ${Array.isArray(formData.jobTypes) ? formData.jobTypes.join(", ") : "N/A"}</p>
        <p><strong>Portfolio:</strong> ${formData.portfolio || "N/A"}</p>
        <p><strong>LinkedIn:</strong> ${formData.linkedin || "N/A"}</p>
        <p><strong>Github:</strong> ${formData.github || "N/A"}</p>
        <p><strong>Website:</strong> ${formData.website || "N/A"}</p>
        <p><strong>Bio:</strong> ${formData.bio || "N/A"}</p>
        <p><strong>Expected Salary:</strong> ${formData.expectedSalary || "N/A"}</p>
        <p><strong>Available:</strong> ${formData.available ? "Yes" : "No"}</p>
        <h3>Educations</h3>
        <ul>
          ${educations.map(
            (edu) =>
              `<li>${edu.degree || ""} in ${edu.field || ""} from ${edu.institution || ""} (${edu.year || ""})</li>`
          ).join("")}
        </ul>
        <h3>Projects</h3>
        <ul>
          ${projects.map(
            (proj) =>
              `<li>${proj.name || ""} (${proj.year || ""}) - ${proj.tech || ""}<br/>${proj.description || ""}</li>`
          ).join("")}
        </ul>
      `,
    });

    res.json({
      success: true,
      message: `🎉 Talent profile saved successfully. Confirmation email sent to ${formData.email} and details sent to admin.`,
      talentId,
    });

  } catch (err) {
    console.error("🔥 Error inserting talent:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Get all talents with full details (ADMIN only)
Talents.get("/talents", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const talents = await query(`SELECT * FROM talents`);

    for (const talent of talents) {
      const skills = await query("SELECT skill FROM skills WHERE talent_id = ?", [talent.id]);
      const jobTypes = await query("SELECT jobType FROM job_types WHERE talent_id = ?", [talent.id]);
      const educations = await query("SELECT * FROM educations WHERE talent_id = ?", [talent.id]);
      const projects = await query("SELECT * FROM projects WHERE talent_id = ?", [talent.id]);

      talent.skills = skills.map((s) => s.skill);
      talent.jobTypes = jobTypes.map((j) => j.jobType);
      talent.educations = educations;
      talent.projects = projects;
    }

    res.json({
      success: true,
      total: talents.length,
      talents,
    });
  } catch (err) {
    console.error("❌ Error fetching talents:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

export default Talents;
