import express from "express";
import authRoutes from "./auth.routes.js";
import cafeRoutes from "./cafe.routes.js";
import companyRoutes from "./company.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/cafe-manager", cafeRoutes);
router.use("/company-manager", companyRoutes);
router.use("/notifications", notificationRoutes);

export default router;
