// auth.constants.js
import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const adminEmails = ["admin@example.com", "admin@talentpool.com"];
