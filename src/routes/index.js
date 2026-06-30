import express from "express";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";
import waiterRoutes from "./waiter.routes.js";
import cafeRoutes from "./cafe.routes.js";
import reportRoutes from "./report.routes.js";
import companyRoutes from "./company.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/employee", employeeRoutes);
router.use("/waiter", waiterRoutes);
router.use("/cafe", cafeRoutes);
// router.use("/cafe-manager", cafeRoutes);
router.use("/reports", reportRoutes);router.use("/company-manager", companyRoutes);
router.use("/notifications", notificationRoutes);


export default router;
