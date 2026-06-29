import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  scanQR,
  createOfflineOrder,
} from "../controllers/waiter.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole("waiter"));

router.post("/scan", scanQR);
router.post("/order", createOfflineOrder);

export default router;
