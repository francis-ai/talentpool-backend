import express from "express";
import { verifyToken } from "./AuthenticationMiddleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  profile,
  updatePassword,
  refreshToken,
  promoteTutor,
  logoutUser,
} from "./AuthenticationController.js";

const router = express.Router();

// =================== Public Routes ===================
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// =================== Protected Routes ===================
router.get("/profile", verifyToken, profile);
router.put("/update-password", verifyToken, updatePassword);
router.post("/refresh-token", refreshToken); // If refresh token needs verifyToken, wrap with verifyToken
router.put("/promote-tutor/:email", verifyToken, promoteTutor);
router.post("/logout", logoutUser);

export default router;
