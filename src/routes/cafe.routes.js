import express from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  getMenu,
  addMenuItem,
  editMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from "../controllers/cafe.controller.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.use(authenticate);
router.use(requireRole("cafe_manager"));

router.get("/menu", getMenu);
router.post("/menu", upload.single("image"), addMenuItem);
router.put("/menu/:id", upload.single("image"), editMenuItem);
router.delete("/menu/:id", deleteMenuItem);
router.patch("/menu/:id/availability", toggleAvailability);

export default router;
