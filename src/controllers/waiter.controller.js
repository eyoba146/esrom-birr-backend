import prisma from "../config/db.js";
import { comparePassword } from "../services/auth.service.js";
import { decryptQRToken } from "../services/qr.service.js";
import { getEmployeeBalance } from "../services/balance.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { auditLog } from "../middleware/auditLogger.js";

export const scanQR = async (req, res) => {
  try {
    const { qr_token } = req.body;

    if (!qr_token) {
      return errorResponse(res, "QR token is required", 400);
    }

    const decoded = decryptQRToken(qr_token);

    if (!decoded) {
      return errorResponse(res, "Invalid or expired QR code", 400);
    }

    const employee = await prisma.users.findUnique({
      where: { id: decoded.employee_id },
      select: {
        id: true,
        fullname: true,
        employee_external_id: true,
        is_active: true,
        departments: {
          select: { name: true },
        },
        employee_qr_codes: {
          select: { is_active: true },
        },
      },
    });

    if (!employee || !employee.is_active) {
      return errorResponse(res, "Employee not found or inactive", 404);
    }

    if (!employee.employee_qr_codes?.is_active) {
      return errorResponse(res, "QR code is inactive", 400);
    }

    const balance = await getEmployeeBalance(employee.id);

    return successResponse(
      res,
      {
        employee: {
          id: employee.id,
          fullname: employee.fullname,
          employee_external_id: employee.employee_external_id,
          department: employee.departments?.name,
          balance,
        },
      },
      "Employee verified successfully",
    );
  } catch (error) {
    console.error("Scan QR error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const createOfflineOrder = async (req, res) => {
  try {
    const { employee_id, password, items, cafe_id } = req.body;

    if (!employee_id || !password || !items || !cafe_id) {
      return errorResponse(
        res,
        "Employee ID, password, items and cafe ID are required",
        400,
      );
    }

    const employee = await prisma.users.findUnique({
      where: { id: employee_id },
    });

    if (!employee || !employee.is_active) {
      return errorResponse(res, "Employee not found or inactive", 404);
    }

    const isPasswordValid = await comparePassword(
      password,
      employee.password_hash,
    );

    if (!isPasswordValid) {
      return errorResponse(res, "Invalid password", 401);
    }

    const menuItems = await prisma.menu_items.findMany({
      where: {
        id: { in: items.map((i) => i.menu_item_id) },
        cafe_id,
        is_available: true,
      },
    });

    if (menuItems.length !== items.length) {
      return errorResponse(res, "One or more items are unavailable", 400);
    }

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
      const subtotal = Number(menuItem.price) * item.quantity;
      totalAmount += subtotal;
      return {
        menu_item_id: menuItem.id,
        item_name_snapshot: menuItem.name,
        unit_price_snapshot: menuItem.price,
        quantity: item.quantity,
        subtotal,
      };
    });

    const balance = await getEmployeeBalance(employee_id);

    if (balance < totalAmount) {
      return errorResponse(res, "Insufficient balance", 400);
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.orders.create({
        data: {
          employee_id,
          cafe_id,
          waiter_id: req.user.id,
          total_amount: totalAmount,
          status: "confirmed",
          order_method: "offline_qr",
          order_items: {
            create: orderItems,
          },
        },
        include: { order_items: true },
      });

      await tx.balance_transactions.create({
        data: {
          user_id: employee_id,
          amount: totalAmount,
          transaction_type: "order",
          reference_note: `Order #${newOrder.id}`,
        },
      });

      return newOrder;
    });

    await auditLog({
      actorId: req.user.id,
      actorRole: "waiter",
      action: "OFFLINE_ORDER_CREATED",
      targetTable: "orders",
      targetId: order.id,
      metadata: { employee_id, total_amount: totalAmount },
    });

    return successResponse(
      res,
      {
        order_id: order.id,
        total_amount: totalAmount,
        remaining_balance: balance - totalAmount,
      },
      "Order created successfully",
    );
  } catch (error) {
    console.error("Create offline order error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};
