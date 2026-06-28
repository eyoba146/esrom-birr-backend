import prisma from "../config/db.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { auditLog } from "../middleware/auditLogger.js";

export const getMenu = async (req, res) => {
  try {
    const cafeStaff = await prisma.cafe_staff.findUnique({
      where: { user_id: req.user.id },
    });

    if (!cafeStaff) {
      return errorResponse(res, "Cafe not found for this manager", 404);
    }

    const menuItems = await prisma.menu_items.findMany({
      where: { cafe_id: cafeStaff.cafe_id },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, menuItems, "Menu fetched successfully");
  } catch (error) {
    console.error("Get menu error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const addMenuItem = async (req, res) => {
  try {
    const { name, description, price } = req.body;

    if (!name || !price) {
      return errorResponse(res, "Name and price are required", 400);
    }

    const cafeStaff = await prisma.cafe_staff.findUnique({
      where: { user_id: req.user.id },
    });

    if (!cafeStaff) {
      return errorResponse(res, "Cafe not found for this manager", 404);
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const menuItem = await prisma.menu_items.create({
      data: {
        cafe_id: cafeStaff.cafe_id,
        name,
        description,
        price,
        image_url: imageUrl,
      },
    });

    await auditLog({
      actorId: req.user.id,
      actorRole: "cafe_manager",
      action: "MENU_ITEM_ADDED",
      targetTable: "menu_items",
      targetId: menuItem.id,
      metadata: { name, price },
    });

    return successResponse(res, menuItem, "Menu item added successfully", 201);
  } catch (error) {
    console.error("Add menu item error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const editMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price && { price }),
      ...(imageUrl && { image_url: imageUrl }),
    };

    const menuItem = await prisma.menu_items.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await auditLog({
      actorId: req.user.id,
      actorRole: "cafe_manager",
      action: "MENU_ITEM_UPDATED",
      targetTable: "menu_items",
      targetId: menuItem.id,
    });

    return successResponse(res, menuItem, "Menu item updated successfully");
  } catch (error) {
    console.error("Edit menu item error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.menu_items.delete({
      where: { id: parseInt(id) },
    });

    await auditLog({
      actorId: req.user.id,
      actorRole: "cafe_manager",
      action: "MENU_ITEM_DELETED",
      targetTable: "menu_items",
      targetId: parseInt(id),
    });

    return successResponse(res, null, "Menu item deleted successfully");
  } catch (error) {
    console.error("Delete menu item error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

export const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await prisma.menu_items.findUnique({
      where: { id: parseInt(id) },
    });

    if (!menuItem) {
      return errorResponse(res, "Menu item not found", 404);
    }

    const updated = await prisma.menu_items.update({
      where: { id: parseInt(id) },
      data: { is_available: !menuItem.is_available },
    });

    await auditLog({
      actorId: req.user.id,
      actorRole: "cafe_manager",
      action: "MENU_ITEM_AVAILABILITY_TOGGLED",
      targetTable: "menu_items",
      targetId: parseInt(id),
      metadata: { is_available: updated.is_available },
    });

    return successResponse(
      res,
      updated,
      `Item marked as ${updated.is_available ? "available" : "unavailable"}`,
    );
  } catch (error) {
    console.error("Toggle availability error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};
