import express from "express";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";
import waiterRoutes from "./waiter.routes.js";
import cafeRoutes from "./cafe.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/employee", employeeRoutes);
router.use("/waiter", waiterRoutes);
router.use("/cafe", cafeRoutes);

export default router;
