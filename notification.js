import express from "express";
import db from "./db.js"; // your MySQL connection
import { verifyToken } from "./AuthenticationRoute.js"; // admin auth

const Announcement = express.Router();

// Get all announcements
Announcement.get("/announcement", (req, res) => {
  db.query(
    "SELECT * FROM announcements ORDER BY created_at DESC",
    (err, rows) => {
      if (err) {
        console.error("Error fetching announcements:", err);
        return res.status(500).json({ message: "Failed to fetch announcements" });
      }
      res.json(rows);
    }
  );
});

// Create a new announcement (admin only)
Announcement.post("/announcement", verifyToken, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content required" });

  db.query(
    "INSERT INTO announcements (title, content) VALUES (?, ?)",
    [title, content],
    (err, result) => {
      if (err) {
        console.error("Error creating announcement:", err);
        return res.status(500).json({ message: "Failed to create announcement" });
      }
      res.status(201).json({ message: "Announcement created", id: result.insertId });
    }
  );
});

// Edit an announcement (admin only)
Announcement.put("/announcement/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { id } = req.params;
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content required" });

  db.query(
    "UPDATE announcements SET title = ?, content = ? WHERE id = ?",
    [title, content, id],
    (err, result) => {
      if (err) {
        console.error("Error updating announcement:", err);
        return res.status(500).json({ message: "Failed to update announcement" });
      }
      if (result.affectedRows === 0) return res.status(404).json({ message: "Announcement not found" });
      res.json({ message: "Announcement updated" });
    }
  );
});

// Delete an announcement (admin only)
Announcement.delete("/announcement/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { id } = req.params;

  db.query("DELETE FROM announcements WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting announcement:", err);
      return res.status(500).json({ message: "Failed to delete announcement" });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  });
});

export default Announcement;
