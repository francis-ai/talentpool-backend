import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import registrationRoutes from "./HireinternForm.js";
import authentication from "./AuthenticationRoute.js";
import uploaded from "./uploadfile.js";
import path from "path";
import paymentRouter from "./payment.js";
import Announcement from "./notification.js";
import regforcourseRoutes from "./regforcourseRoutes.js";
import Talents from "./Talents.js";
import blogRouter from "./blog.js";

dotenv.config();

const app = express();

// ✅ CORS Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true,               // allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Body parsing middleware (important!)
app.use(express.json());               // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies

// ✅ Serve uploaded images
app.use("/uploads", express.static(path.resolve("uploads")));

// ✅ API Routes
app.use("/api", registrationRoutes);
app.use("/api", authentication);
app.use("/api", uploaded);
app.use("/api/payment", paymentRouter);
app.use("/api", regforcourseRoutes);
app.use("/api", Announcement);
app.use("/api", Talents);
app.use("/api/blogs", blogRouter);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ✅ Start server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});