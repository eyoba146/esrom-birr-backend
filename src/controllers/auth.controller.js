import prisma from "../config/db.js";
import { comparePassword, generateToken } from "../services/auth.service.js";
import { writeAuditLog } from "../services/audit.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const login = async (req, res) => {
  try {
    const { employee_external_id, password } = req.body;

    if (!employee_external_id || !password) {
      return errorResponse(res, "Employee ID and password are required", 400);
    }

    const user = await prisma.users.findUnique({
      where: { employee_external_id },
      include: {
        user_roles: {
          include: { roles: true },
        },
      },
    });

    if (!user) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    if (!user.is_active) {
      return errorResponse(
        res,
        "Account is disabled. Contact your company manager",
        403,
      );
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const roles = user.user_roles.map((ur) => ur.roles.name);

    const token = generateToken({
      id: user.id,
      employee_external_id: user.employee_external_id,
      roles,
    });

    await prisma.$transaction(async (tx) => {
      await tx.login_history.create({
        data: {
          user_id: user.id,
          ip_address: req.ip,
          device_info: req.headers["user-agent"],
        },
      });

      await writeAuditLog(
        {
          userId: user.id,
          action: "auth.login",
          entityType: "users",
          entityId: user.id,
          description: "User logged in",
          ipAddress: req.ip,
        },
        tx,
      );
    });

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          fullname: user.fullname,
          employee_external_id: user.employee_external_id,
          roles,
        },
      },
      "Login successful",
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};
