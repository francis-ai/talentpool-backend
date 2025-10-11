import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; // ✅ import cookie-parser
import registrationRoutes from "./HireinternForm.js";
import authRoutes from "./Auth/Authenticationroute.js";  // auth router
import uploaded from "./uploadfile.js";
import path from "path";
import paymentRouter from "./payment.js";
import Announcement from "./notification.js";
import regforcourseRoutes from "./regforcourseRoutes.js";
import Talents from "./Talents.js";
import blogRouter from "./blog.js";
import authentication from "./AuthenticationRoute.js"
dotenv.config();

const app = express();

// =================== MIDDLEWARE ===================

// ✅ CORS Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000", // dev
      "https://talentpoolafrica.com", // production
      "https://www.talentpoolafrica.com", // production (www)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Cookie parsing middleware (must come before routes that use cookies)
app.use(cookieParser());

// ✅ Serve uploaded images
app.use("/uploads", express.static(path.resolve("uploads"))); // optional

// =================== ROUTES ===================
app.use("/api", registrationRoutes)
app.use("/api", authRoutes);
app.use("/api", uploaded);
app.use("/api", authentication);
 app.use("/api/payment", paymentRouter);
 app.use("/api", regforcourseRoutes);
app.use("/api", Announcement);
 app.use("/api", Talents);
 app.use("/api/blogs", blogRouter);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// =================== START SERVER ===================
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});