import prisma from "../config/db.js";
import { getEmployeeBalance } from "../services/balance.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { auditLog } from "../middleware/auditLogger.js";
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullname: true,
        employee_external_id: true,
        email: true,
        phone_number: true,
        is_active: true,
        created_at: true,
        departments: {
          select: { name: true },
        },
      },
    });

    return successResponse(res, user, "Profile fetched successfully");
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const getBalance = async (req, res) => {
  try {
    const balance = await getEmployeeBalance(req.user.id);
    return successResponse(res, { balance }, "Balance fetched successfully");
  } catch (error) {
    console.error("Get balance error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      where: { employee_id: req.user.id },
      include: {
        order_items: {
          include: {
            menu_items: {
              select: { name: true, price: true },
            },
          },
        },
        cafes: {
          select: { name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, orders, "Orders fetched successfully");
  } catch (error) {
    console.error("Get orders error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notifications.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: "desc" },
    });

    return successResponse(
      res,
      notifications,
      "Notifications fetched successfully",
    );
  } catch (error) {
    console.error("Get notifications error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notifications.update({
      where: { id: parseInt(id) },
      data: { is_read: true },
    });

    return successResponse(res, notification, "Notification marked as read");
  } catch (error) {
    console.error("Mark notification error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const generateQR = async (req, res) => {
  try {
    const { generateQRToken } = await import("../services/qr.service.js");

    const token = generateQRToken(req.user.id);

    const existing = await prisma.employee_qr_codes.findUnique({
      where: { user_id: req.user.id },
    });

    if (existing) {
      await prisma.employee_qr_codes.update({
        where: { user_id: req.user.id },
        data: {
          token_hash: token,
          is_active: true,
        },
      });
    } else {
      await prisma.employee_qr_codes.create({
        data: {
          user_id: req.user.id,
          token_hash: token,
          is_active: true,
        },
      });
    }

    await auditLog({
      actorId: req.user.id,
      actorRole: "employee",
      action: "QR_GENERATED",
      targetTable: "employee_qr_codes",
      targetId: req.user.id,
    });

    return successResponse(
      res,
      { qr_token: token },
      "QR code generated successfully",
    );
  } catch (error) {
    console.error("Generate QR error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};
