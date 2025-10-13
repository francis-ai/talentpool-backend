// ================= COURSE MODULE MANAGEMENT =================
import express from "express";
import { verifyToken } from "./Auth/AuthenticationMiddleware.js";
import { query } from "./db.js";

const course = express.Router();

function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only: Access denied" });
  }
  next();
}

// 🟢 1️⃣ ADD SYLLABUS TO COURSE
course.post("/courses/:courseId/syllabus", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, order_no } = req.body;
    const { courseId } = req.params;

    if (!title)
      return res.status(400).json({ message: "Syllabus title is required." });

    await query(
      "INSERT INTO CourseSyllabus (course_id, title, description, order_no) VALUES (?, ?, ?, ?)",
      [courseId, title, description, order_no || 0]
    );

    res.json({ message: "Syllabus added successfully." });
  } catch (err) {
    console.error("Add syllabus error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🟡 2️⃣ GET SYLLABUS (WITH MATERIALS + VIDEOS) BY COURSE ID
course.get("/courses/:courseId/syllabus", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get all syllabus items
    const syllabus = await query(
      "SELECT * FROM CourseSyllabus WHERE course_id = ? ORDER BY order_no ASC",
      [courseId]
    );

    // For each syllabus, attach materials and videos
    for (const item of syllabus) {
      item.materials = await query("SELECT * FROM CourseMaterials WHERE syllabus_id = ?", [item.id]);
      item.videos = await query("SELECT * FROM CourseVideos WHERE syllabus_id = ?", [item.id]);
    }

    res.json(syllabus);
  } catch (err) {
    console.error("Get syllabus error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🟠 3️⃣ UPDATE SYLLABUS ITEM
course.put("/syllabus/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, order_no } = req.body;
    const { id } = req.params;

    await query(
      "UPDATE CourseSyllabus SET title = ?, description = ?, order_no = ? WHERE id = ?",
      [title, description, order_no, id]
    );

    res.json({ message: "Syllabus updated successfully." });
  } catch (err) {
    console.error("Update syllabus error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🔴 4️⃣ DELETE SYLLABUS ITEM
course.delete("/syllabus/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await query("DELETE FROM CourseMaterials WHERE syllabus_id = ?", [id]);
    await query("DELETE FROM CourseVideos WHERE syllabus_id = ?", [id]);
    await query("DELETE FROM CourseSyllabus WHERE id = ?", [id]);

    res.json({ message: "Syllabus and related content deleted." });
  } catch (err) {
    console.error("Delete syllabus error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🧾 5️⃣ ADD MATERIAL TO SYLLABUS
course.post("/syllabus/:syllabusId/material", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, file_url } = req.body;
    const { syllabusId } = req.params;

    await query(
      "INSERT INTO CourseMaterials (syllabus_id, title, file_url) VALUES (?, ?, ?)",
      [syllabusId, title, file_url]
    );

    res.json({ message: "Material added successfully." });
  } catch (err) {
    console.error("Add material error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🎥 6️⃣ ADD VIDEO TO SYLLABUS
course.post("/syllabus/:syllabusId/video", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, video_url } = req.body;
    const { syllabusId } = req.params;

    await query(
      "INSERT INTO CourseVideos (syllabus_id, title, video_url) VALUES (?, ?, ?)",
      [syllabusId, title, video_url]
    );

    res.json({ message: "Video added successfully." });
  } catch (err) {
    console.error("Add video error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🧠 7️⃣ ADD TEST QUESTION
course.post("/courses/:courseId/test", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_answer } = req.body;
    const { courseId } = req.params;

    await query(
      "INSERT INTO CourseTests (course_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [courseId, question, option_a, option_b, option_c, option_d, correct_answer]
    );

    res.json({ message: "Test question added." });
  } catch (err) {
    console.error("Add test question error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📚 8️⃣ GET TEST QUESTIONS
course.get("/courses/:courseId/test", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const tests = await query("SELECT * FROM CourseTests WHERE course_id = ?", [courseId]);
    res.json(tests);
  } catch (err) {
    console.error("Get test questions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default course;
