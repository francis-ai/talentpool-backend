import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";

// ===== ROUTES =====
import registrationRoutes from "./HireinternForm.js";
import authRoutes from "./Auth/Authenticationroute.js";
import uploaded from "./uploadfile.js";
import paymentRouter from "./payment.js";
import Announcement from "./notification.js";
import regforcourseRoutes from "./regforcourseRoutes.js";
import Talents from "./Talents.js";
import blogRouter from "./blog.js";
import authentication from "./AuthenticationRoute.js";
import courseModule from "./courseModule.js";
import subscriptionRoute from "./routes/subscriptionRoutes.js"

dotenv.config();
const app = express();

// =================== BASIC MIDDLEWARE ===================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =================== CORS ===================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://talentpoolafrica.com.ng",
      "https://www.talentpoolafrica.com.ng",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// =================== SESSION (critical for cookies) ===================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // ❗ prevents JS access to cookie
      secure: process.env.NODE_ENV === "production", // ❗ must be true on HTTPS
      sameSite: "None", // ❗ required for cross-domain cookies
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// =================== STATIC FILES ===================
app.use("/uploads", express.static(path.resolve("uploads")));

// =================== LOGGING MIDDLEWARE ===================
app.use((req, res, next) => {
  console.log("🌀 [REQUEST]:", req.method, req.url);
  console.log("🔑 Cookies received:", req.cookies);
  console.log("📱 User Agent:", req.get("User-Agent"));
  console.log("🗂 Session ID:", req.sessionID);
  console.log("------------------------------------------");
  next();
});

// =================== ROUTES ===================
app.use("/api", registrationRoutes);
app.use("/api", authRoutes);
app.use("/api", uploaded);
app.use("/api", authentication);
app.use("/api/payment", paymentRouter);
app.use("/api", regforcourseRoutes);
app.use("/api", Announcement);
app.use("/api", Talents);
app.use("/api/blogs", blogRouter);
app.use("/api", subscriptionRoute);
app.use("/api", courseModule);

// =================== HEALTH CHECK ===================
app.get("/", (req, res) => {
  console.log("🔁 Refresh detected at /");
  console.log("📊 Current session data:", req.session);
  console.log("🍪 Current cookies:", req.cookies);
  console.log("✅ All systems operational!");
  console.log("==========================================");
  res.send("🚀 Backend is running and cookies/session working!");
});

// =================== LOGOUT (optional test route) ===================
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
  });
  req.session?.destroy(() => {});
  console.log("👋🏽 User logged out. Session cleared.");
  res.status(200).json({ message: "Logged out successfully" });
});

// =================== SERVER ===================
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌐 NODE_ENV:", process.env.NODE_ENV);
  console.log("🔐 Session secret set:", !!process.env.SESSION_SECRET);
  console.log("✅ CORS, cookies, and sessions configured correctly.");
});
