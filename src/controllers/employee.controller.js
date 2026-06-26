import prisma from "../config/db.js";
import { getEmployeeBalance } from "../services/balance.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

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
