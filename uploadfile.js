// uploaded.js
import express from "express";
import { query } from "./db.js";
import { verifyToken } from "./Auth/AuthenticationMiddleware.js";
import multer from "multer";
import path from "path";

const uploaded = express.Router();

// ================== MULTER SETUP ==================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder to store images
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // unique file name
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ================== MIDDLEWARE ==================
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only: Access denied" });
  }
  next();
}

// ================== ADMIN ROUTES ==================

// 1️⃣ Create a new course with image (ADMIN ONLY)
uploaded.post(
  "/courses",
  verifyToken,
  verifyAdmin,
  upload.single("image"), // multer middleware
  async (req, res) => {
    try {
      const { title, description, price } = req.body;
      if (!title || !description || !price) {
        return res.status(400).json({ message: "All fields are required." });
      }

      const image_url = req.file ? `/uploads/${req.file.filename}` : null;

      const result = await query(
        "INSERT INTO CreateCourse (title, description, price, image_url) VALUES (?, ?, ?, ?)",
        [title, description, price, image_url]
      );

      res.json({ message: "Course created", courseId: result.insertId, image_url });
    } catch (err) {
      console.error("Create Course Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// 2️⃣ Add module (ADMIN ONLY)
uploaded.post("/modules", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { course_id, title } = req.body;
    if (!course_id || !title) {
      return res.status(400).json({ message: "All fields required" });
    }
    const result = await query(
      "INSERT INTO CreateModule (course_id, title) VALUES (?, ?)",
      [course_id, title]
    );
    res.json({ message: "Module created", moduleId: result.insertId });
  } catch (err) {
    console.error("Add Module Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 3️⃣ Add lesson (ADMIN ONLY)
uploaded.post("/lessons", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { module_id, title, video_url } = req.body;
    if (!module_id || !title || !video_url) {
      return res.status(400).json({ message: "All fields required" });
    }
    const result = await query(
      "INSERT INTO CreateLessons (module_id, title, video_url) VALUES (?, ?, ?)",
      [module_id, title, video_url]
    );
    res.json({ message: "Lesson created", lessonId: result.insertId });
  } catch (err) {
    console.error("Add Lesson Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== PUBLIC ROUTES ==================

// 4️⃣ Get all courses (PUBLIC)
uploaded.get("/courses", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM CreateCourse");
    res.json(rows);
  } catch (err) {
    console.error("Get Courses Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 5️⃣ Get course details with modules + lessons (PUBLIC)
uploaded.get("/course/:courseId/details", async (req, res) => {
  try {
    const { courseId } = req.params;
    const modules = await query("SELECT * FROM CreateModule WHERE course_id = ?", [courseId]);

    for (let mod of modules) {
      const lessons = await query("SELECT * FROM CreateLessons WHERE module_id = ?", [mod.id]);
      mod.lessons = lessons;
    }

    res.json({ modules });
  } catch (err) {
    console.error("Get Course Details Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== STUDENT ROUTES ==================

// 6️⃣ Get all courses with enrollment status (STUDENT ONLY)
uploaded.get("/courses-with-status", verifyToken, async (req, res) => {
  const user_email = req.user.email;
  try {
    const courses = await query("SELECT * FROM CreateCourse");
    const enrollments = await query(
      "SELECT course_id, paid FROM Enrollments WHERE user_email = ?",
      [user_email]
    );

    const enrollmentMap = {};
    enrollments.forEach((en) => {
      enrollmentMap[en.course_id] = en.paid;
    });

    const coursesWithStatus = courses.map((course) => ({
      ...course,
      purchased: enrollmentMap[course.id] === 1,
    }));

    res.json(coursesWithStatus);
  } catch (err) {
    console.error("Error fetching courses with status:", err.message);
    res.status(500).json({ message: "Failed to load courses" });
  }
});

// 7️⃣ Get MY enrolled & paid courses (STUDENT ONLY)
uploaded.get("/my-courses", verifyToken, async (req, res) => {
  try {
    const user_email = req.user.email;
    const rows = await query(
      `SELECT c.id, c.title, c.description, c.price, e.paid_at
       FROM Enrollments e
       JOIN CreateCourse c ON e.course_id = c.id
       WHERE e.user_email = ? AND e.paid = 1`,
      [user_email]
    );
    res.json(rows);
  } catch (err) {
    console.error("My Courses Error:", err);
    res.status(500).json({ message: "Failed to fetch enrolled courses" });
  }
});

// 8️⃣ Get course content (modules + lessons) ONLY if purchased
uploaded.get("/course/:courseId/content", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_email = req.user.email;

    const enrollment = await query(
      "SELECT paid FROM Enrollments WHERE user_email = ? AND course_id = ?",
      [user_email, courseId]
    );

    if (!enrollment.length || enrollment[0].paid != 1) {
      return res.status(403).json({ message: "You must purchase this course to view lessons." });
    }

    const modules = await query("SELECT * FROM CreateModule WHERE course_id = ?", [courseId]);

    for (let mod of modules) {
      const lessons = await query("SELECT * FROM CreateLessons WHERE module_id = ?", [mod.id]);
      mod.lessons = lessons;
    }

    res.json({ modules });
  } catch (err) {
    console.error("Get Course Content Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark lesson as completed (STUDENT ONLY)
uploaded.post("/lessons/complete", verifyToken, async (req, res) => {
  try {
    const { lesson_id } = req.body;
    const user_email = req.user.email;

    await query(`
      INSERT INTO LessonProgress (user_email, lesson_id, completed, completed_at)
      VALUES (?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE completed=1, completed_at=NOW()
    `, [user_email, lesson_id]);

    res.json({ message: "Lesson marked as completed!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update lesson progress." });
  }
});

// Get total number of courses (ADMIN ONLY)
uploaded.get("/admin/courses/count", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = await query("SELECT COUNT(*) AS totalCourses FROM CreateCourse");
    res.json({ totalCourses: rows[0].totalCourses });
  } catch (err) {
    console.error("Admin Get Total Courses Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== EDIT COURSE (ADMIN ONLY) ==================
uploaded.put("/courses/:courseId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await query(
      "UPDATE CreateCourse SET title = ?, description = ?, price = ? WHERE id = ?",
      [title, description, price, courseId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course updated successfully" });
  } catch (err) {
    console.error("Edit Course Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== DELETE COURSE (ADMIN ONLY) ==================
uploaded.delete("/courses/:courseId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await query("DELETE FROM CreateCourse WHERE id = ?", [courseId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Delete Course Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== GET ALL LESSONS (ADMIN ONLY) ==================
uploaded.get("/lessons", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const lessons = await query("SELECT * FROM CreateLessons");
    res.json(lessons);
  } catch (err) {
    console.error("Get Lessons Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== EDIT LESSON (ADMIN ONLY) ==================
uploaded.put("/lessons/:lessonId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, video_url } = req.body;

    if (!title || !video_url) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await query(
      "UPDATE CreateLessons SET title = ?, video_url = ? WHERE id = ?",
      [title, video_url, lessonId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json({ message: "Lesson updated successfully" });
  } catch (err) {
    console.error("Edit Lesson Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== DELETE LESSON (ADMIN ONLY) ==================
uploaded.delete("/lessons/:lessonId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const result = await query("DELETE FROM CreateLessons WHERE id = ?", [lessonId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    console.error("Delete Lesson Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default uploaded;
