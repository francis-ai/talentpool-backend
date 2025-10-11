import express from "express";
import { 
  getPlans, 
  createPlan, 
  updatePlan, 
  deletePlan, 
  getAllSubscriptions,
  subscribeToPlan, 
  handlePaystackWebhook,
  getPaymentInfo,
  getLessons,
  getUserLessonsWithAccess
} from "../controllers/Subscription.js";

const router = express.Router();

// Plan management
router.get("/subscription/plans", getPlans);
router.post("/subscription/plans", createPlan);
router.put("/subscription/plans/:id", updatePlan);
router.delete("/subscription/plans/:id", deletePlan);

// Subscriptions management
router.get("/subscription/subscriptions", getAllSubscriptions);

// Start subscription payment
router.post("/subscription/subscribe/:planId", subscribeToPlan);
router.get("/subscription/payment-info/:reference", getPaymentInfo);

router.get("/subscription/lessons", getLessons);
router.get("/subscription/user-lessons", getUserLessonsWithAccess);

// Paystack webhook
router.post("/paystack/webhook", handlePaystackWebhook);

export default router;

// CREATE TABLE subscription_payments (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_email VARCHAR(225) NOT NULL,
//   plan_id INT NOT NULL,
//   reference VARCHAR(255) NOT NULL,        -- Paystack reference
//   amount DECIMAL(10,2) NOT NULL,
//   status ENUM('pending','success','failed') DEFAULT 'pending',
//   payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
// );

// ALTER TABLE user_subscriptions DROP COLUMN user_id;
// ALTER TABLE user_subscriptions ADD COLUMN user_email VARCHAR(255) NOT NULL AFTER id;

