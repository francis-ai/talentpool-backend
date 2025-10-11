// blog.js 
import express from "express";
import db from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { verifyToken } from "./Auth/AuthenticationMiddleware.js";
import multer from "multer";
import path from "path";
import util from "util";

const blogRouter = express.Router();
const query = util.promisify(db.query).bind(db);

// =================== Multer Setup ===================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage });

// =================== CREATE A BLOG WITH IMAGE ===================
blogRouter.post("/create", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    const { title, content, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

    const blogId = uuidv4();
    const image = req.file ? req.file.filename : null;

    await query(
      "INSERT INTO blogs (id, title, content, tags, created_by, created_at, image) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
      [blogId, title, content, tags || "", req.user.email, image]
    );

    res.status(201).json({ message: "Blog created successfully", blogId, image });
  } catch (err) {
    console.error("❌ Create blog error:", err);
    res.status(500).json({ message: "Failed to create blog" });
  }
});

// =================== GET ALL BLOGS ===================
blogRouter.get("/", async (req, res) => {
  try {
    const blogs = await query(
      "SELECT b.id, b.title, b.content, b.tags, b.created_by, b.created_at, b.image, COUNT(c.id) as comments_count FROM blogs b LEFT JOIN comments c ON b.id = c.blog_id GROUP BY b.id ORDER BY b.created_at DESC"
    );
    res.status(200).json(blogs);
  } catch (err) {
    console.error("❌ Get blogs error:", err);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

// =================== GET SINGLE BLOG ===================
blogRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await query("SELECT * FROM blogs WHERE id = ?", [id]);
    if (blog.length === 0) return res.status(404).json({ message: "Blog not found" });

    const comments = await query(
      "SELECT id, commenter_name, comment, created_at FROM comments WHERE blog_id = ? ORDER BY created_at ASC",
      [id]
    );

    res.status(200).json({ ...blog[0], comments });
  } catch (err) {
    console.error("❌ Get single blog error:", err);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

// =================== UPDATE BLOG ===================
blogRouter.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;
    const { title, content, tags } = req.body;
    const image = req.file ? req.file.filename : null;

    const blog = await query("SELECT * FROM blogs WHERE id = ?", [id]);
    if (blog.length === 0) return res.status(404).json({ message: "Blog not found" });

    const updatedImage = image || blog[0].image;

    await query(
      "UPDATE blogs SET title = ?, content = ?, tags = ?, image = ? WHERE id = ?",
      [title, content, tags || "", updatedImage, id]
    );

    res.status(200).json({ message: "Blog updated successfully", image: updatedImage });
  } catch (err) {
    console.error("❌ Update blog error:", err);
    res.status(500).json({ message: "Failed to update blog" });
  }
});

// =================== DELETE BLOG ===================
blogRouter.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;
    const blog = await query("SELECT image FROM blogs WHERE id = ?", [id]);

    if (blog.length === 0) return res.status(404).json({ message: "Blog not found" });

    if (blog[0].image) {
      import('fs').then(fs => {
        fs.unlink(`uploads/${blog[0].image}`, err => {
          if (err) console.error("❌ Failed to delete image file:", err);
        });
      });
    }

    await query("DELETE FROM blogs WHERE id = ?", [id]);
    await query("DELETE FROM comments WHERE blog_id = ?", [id]);

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error("❌ Delete blog error:", err);
    res.status(500).json({ message: "Failed to delete blog" });
  }
});

// =================== POST COMMENT (all anonymous) ===================
blogRouter.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Only students can comment
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can post comments" });
    }

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ message: "Comment is required" });
    }

    const commenter_name = "Anonymous"; // Always anonymous

    const blog = await query("SELECT * FROM blogs WHERE id = ?", [id]);
    if (blog.length === 0) return res.status(404).json({ message: "Blog not found" });

    await query(
      "INSERT INTO comments (blog_id, commenter_name, comment, created_at) VALUES (?, ?, ?, NOW())",
      [id, commenter_name, comment.trim()]
    );

    res.status(201).json({ message: "Comment added successfully" });
  } catch (err) {
    console.error("❌ Add comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// =================== SERVE UPLOADED IMAGES ===================
blogRouter.use("/uploads", express.static("uploads"));

export default blogRouter;
