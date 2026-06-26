import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  getProfile,
  getBalance,
  getOrders,
  getNotifications,
  markNotificationRead,
} from "../controllers/employee.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole("employee"));

router.get("/profile", getProfile);
router.get("/balance", getBalance);
router.get("/orders", getOrders);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
