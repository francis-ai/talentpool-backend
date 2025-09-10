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
import Talents from "./Talents.js"
import blogRouter from "./blog.js"
dotenv.config();

const app = express();

// Middleware
app.use(cors({
   origin: "https://www.talentpoolafrica.com.ng",
  credentials: true,
}));
app.use(express.json());

// ✅ Serve uploaded images
app.use("/uploads", express.static(path.resolve("uploads")));


// API Routes
app.use("/api", registrationRoutes);
app.use("/api", authentication);
app.use("/api", uploaded);
app.use("/api/payment", paymentRouter);
app.use("/api", regforcourseRoutes);
app.use("/api", Announcement)
app.use("/api", Talents);
app.use("/api/blogs", blogRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
