import express from "express";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/employee", employeeRoutes);

export default router;
