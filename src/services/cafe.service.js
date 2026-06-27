import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { UPLOAD_MENU_DIR } from "../middleware/upload.middleware.js";

const COUNTABLE_ORDER_STATUSES = ["confirmed", "preparing", "ready", "completed"];

const resolveCafeId = (user) => {
  if (!user.cafeId) {
    throw new AppError("Cafe manager is not assigned to a cafe", 403);
  }
  return user.cafeId;
};

const formatMenuItem = (item) => ({
  id: item.id,
  cafe_id: item.cafe_id,
  name: item.name,
  description: item.description,
  price: Number(item.price),
  image_url: item.image_url,
  is_available: item.is_available,
  created_at: item.created_at,
  updated_at: item.updated_at,
});

const OPERATIONAL_REPORT_FIELDS = [
  { key: "metric", header: "Metric" },
  { key: "name", header: "Name" },
  { key: "total_orders", header: "Total Orders" },
  { key: "total_sales", header: "Total Sales" },
  { key: "quantity", header: "Quantity" },
  { key: "extra", header: "Extra" },
];

const parseMonth = (month) => {
  const value = month || new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = value.split("-").map(Number);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new AppError("Invalid month", 400);
  }

  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  return {
    monthString: value,
    monthStart,
    monthEnd,
  };
};

const generateCsv = (rows) => {
  return stringify(rows, {
    header: true,
    columns: OPERATIONAL_REPORT_FIELDS.map((field) => ({
      key: field.key,
      header: field.header,
    })),
  });
};

const generateExcel = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cafe Report");
  sheet.columns = OPERATIONAL_REPORT_FIELDS.map((field) => ({
    header: field.header,
    key: field.key,
    width: 24,
  }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
};

const generatePdf = (rows, title) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10);

    doc.text(OPERATIONAL_REPORT_FIELDS.map((field) => field.header).join(" | "), { width: 520 });
    doc.moveDown(0.5);

    for (const row of rows) {
      doc.text(OPERATIONAL_REPORT_FIELDS.map((field) => row[field.key] ?? "").join(" | "), { width: 520 });
      doc.moveDown(0.2);
    }

    doc.end();
  });
};

const getMenuItemForCafe = async (menuItemId, cafeId) => {
  const item = await prisma.menu_items.findFirst({
    where: { id: menuItemId, cafe_id: cafeId },
  });

  if (!item) {
    throw new AppError("Menu item not found", 404);
  }

  return item;
};

const deleteImageFile = (imageUrl) => {
  if (!imageUrl) return;

  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOAD_MENU_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const getMenuItems = async (user) => {
  const cafeId = resolveCafeId(user);

  const items = await prisma.menu_items.findMany({
    where: { cafe_id: cafeId },
    orderBy: [{ is_available: "desc" }, { name: "asc" }],
  });

  return items.map(formatMenuItem);
};

export const createMenuItem = async (user, payload, imageFile) => {
  const cafeId = resolveCafeId(user);

  const cafe = await prisma.cafes.findFirst({
    where: { id: cafeId, is_active: true },
  });

  if (!cafe) {
    throw new AppError("Assigned cafe is inactive or not found", 404);
  }

  const imageUrl = imageFile ? `/uploads/menu/${imageFile.filename}` : null;

  const item = await prisma.menu_items.create({
    data: {
      cafe_id: cafeId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      is_available: payload.is_available,
      image_url: imageUrl,
    },
  });

  return formatMenuItem(item);
};

export const updateMenuItem = async (user, menuItemId, payload, imageFile) => {
  const cafeId = resolveCafeId(user);
  const existing = await getMenuItemForCafe(menuItemId, cafeId);

  const updateData = { ...payload, updated_at: new Date() };

  if (imageFile) {
    deleteImageFile(existing.image_url);
    updateData.image_url = `/uploads/menu/${imageFile.filename}`;
  }

  const item = await prisma.menu_items.update({
    where: { id: menuItemId },
    data: updateData,
  });

  return formatMenuItem(item);
};

export const deleteMenuItem = async (user, menuItemId) => {
  const cafeId = resolveCafeId(user);
  const existing = await getMenuItemForCafe(menuItemId, cafeId);

  const orderCount = await prisma.order_items.count({
    where: { menu_item_id: menuItemId },
  });

  if (orderCount > 0) {
    const item = await prisma.menu_items.update({
      where: { id: menuItemId },
      data: { is_available: false, updated_at: new Date() },
    });

    return {
      ...formatMenuItem(item),
      deleted: false,
      message: "Item has existing orders and was marked unavailable instead of deleted",
    };
  }

  deleteImageFile(existing.image_url);

  await prisma.menu_items.delete({
    where: { id: menuItemId },
  });

  return {
    id: menuItemId,
    deleted: true,
    message: "Menu item deleted successfully",
  };
};

export const getCafeStatistics = async (user, dateRange = null) => {
  const cafeId = resolveCafeId(user);

  const orderFilter = {
    cafe_id: cafeId,
    status: { in: COUNTABLE_ORDER_STATUSES },
    ...(dateRange ? { created_at: { gte: dateRange.monthStart, lt: dateRange.monthEnd } } : {}),
  };

  const [totalOrders, revenueAggregate, orderItems, orders] = await Promise.all([
    prisma.orders.count({ where: orderFilter }),
    prisma.orders.aggregate({
      where: orderFilter,
      _sum: { total_amount: true },
    }),
    prisma.order_items.findMany({
      where: {
        orders: orderFilter,
      },
      select: {
        menu_item_id: true,
        item_name_snapshot: true,
        quantity: true,
      },
    }),
    prisma.orders.findMany({
      where: orderFilter,
      select: {
        employee_id: true,
        waiter_id: true,
        total_amount: true,
        created_at: true,
        users_orders_employee_idTousers: {
          select: {
            id: true,
            employee_external_id: true,
            fullname: true,
          },
        },
        users_orders_waiter_idTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    }),
  ]);

  const itemCounts = new Map();

  for (const item of orderItems) {
    const key = item.menu_item_id ?? item.item_name_snapshot;
    const label = item.item_name_snapshot;
    const current = itemCounts.get(key) ?? { name: label, totalQuantity: 0 };
    current.totalQuantity += item.quantity;
    itemCounts.set(key, current);
  }

  let mostOrderedItem = null;
  for (const entry of itemCounts.values()) {
    if (!mostOrderedItem || entry.totalQuantity > mostOrderedItem.totalQuantity) {
      mostOrderedItem = entry;
    }
  }

  const dailyOrdersMap = new Map();
  const monthlyRevenueMap = new Map();
  const employeeUsageMap = new Map();
  const waiterPerformanceMap = new Map();
  const peakHourMap = new Map();

  for (const order of orders) {
    if (!order.created_at) continue;

    const dateKey = order.created_at.toISOString().slice(0, 10);
    const monthKey = order.created_at.toISOString().slice(0, 7);
    const hourKey = `${String(order.created_at.getUTCHours()).padStart(2, "0")}:00`;
    const amount = Number(order.total_amount);

    dailyOrdersMap.set(dateKey, (dailyOrdersMap.get(dateKey) ?? 0) + 1);
    monthlyRevenueMap.set(
      monthKey,
      (monthlyRevenueMap.get(monthKey) ?? 0) + amount,
    );
    peakHourMap.set(hourKey, (peakHourMap.get(hourKey) ?? 0) + 1);

    const employeeKey = order.employee_id;
    const employeeUsage = employeeUsageMap.get(employeeKey) ?? {
      employee_id: order.users_orders_employee_idTousers?.employee_external_id ?? employeeKey,
      employee_name: order.users_orders_employee_idTousers?.fullname ?? "Unknown",
      total_orders: 0,
      total_amount: 0,
    };
    employeeUsage.total_orders += 1;
    employeeUsage.total_amount += amount;
    employeeUsageMap.set(employeeKey, employeeUsage);

    if (order.waiter_id) {
      const waiterPerformance = waiterPerformanceMap.get(order.waiter_id) ?? {
        waiter_id: order.waiter_id,
        waiter_name: order.users_orders_waiter_idTousers?.fullname ?? "Unknown",
        total_orders: 0,
        total_sales: 0,
      };
      waiterPerformance.total_orders += 1;
      waiterPerformance.total_sales += amount;
      waiterPerformanceMap.set(order.waiter_id, waiterPerformance);
    }
  }

  const dailyOrders = Array.from(dailyOrdersMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
    .map(([month, revenue]) => ({
      month,
      revenue: Number(revenue.toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const peakOrderingHours = Array.from(peakHourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  const employeeUsage = Array.from(employeeUsageMap.values())
    .map((entry) => ({
      ...entry,
      total_amount: Number(entry.total_amount.toFixed(2)),
    }))
    .sort((a, b) => b.total_amount - a.total_amount);

  const waiterPerformance = Array.from(waiterPerformanceMap.values())
    .map((entry) => ({
      ...entry,
      total_sales: Number(entry.total_sales.toFixed(2)),
    }))
    .sort((a, b) => b.total_orders - a.total_orders);

  return {
    total_orders: totalOrders,
    total_sales: Number(revenueAggregate._sum.total_amount ?? 0),
    transaction_volume: dailyOrders,
    most_ordered_item: mostOrderedItem
      ? {
          name: mostOrderedItem.name,
          total_quantity: mostOrderedItem.totalQuantity,
        }
      : null,
    daily_orders: dailyOrders,
    monthly_revenue: monthlyRevenue,
    employee_usage: employeeUsage,
    waiter_performance: waiterPerformance,
    peak_ordering_hours: peakOrderingHours,
  };
};

const buildOperationalReportRows = (stats) => {
  const rows = [
    {
      metric: "summary",
      name: "Total",
      total_orders: stats.total_orders,
      total_sales: stats.total_sales,
      quantity: null,
      extra: "All countable orders",
    },
  ];

  if (stats.most_ordered_item) {
    rows.push({
      metric: "most_ordered_food",
      name: stats.most_ordered_item.name,
      total_orders: null,
      total_sales: null,
      quantity: stats.most_ordered_item.total_quantity,
      extra: "Top food by quantity",
    });
  }

  for (const waiter of stats.waiter_performance) {
    rows.push({
      metric: "waiter_performance",
      name: waiter.waiter_name,
      total_orders: waiter.total_orders,
      total_sales: waiter.total_sales,
      quantity: null,
      extra: `Waiter ID ${waiter.waiter_id}`,
    });
  }

  for (const employee of stats.employee_usage) {
    rows.push({
      metric: "employee_usage",
      name: employee.employee_name,
      total_orders: employee.total_orders,
      total_sales: employee.total_amount,
      quantity: null,
      extra: `Employee ID ${employee.employee_id}`,
    });
  }

  for (const hour of stats.peak_ordering_hours) {
    rows.push({
      metric: "peak_ordering_hour",
      name: hour.hour,
      total_orders: hour.count,
      total_sales: null,
      quantity: null,
      extra: "UTC hour",
    });
  }

  return rows;
};

export const getOperationalReport = async (user, params) => {
  const cafeId = resolveCafeId(user);
  const { monthStart, monthEnd, monthString } = parseMonth(params.month);
  const stats = await getCafeStatistics({ ...user, cafeId }, { monthStart, monthEnd });

  const rows = buildOperationalReportRows(stats);

  if (params.format === "csv") {
    return {
      format: "csv",
      data: generateCsv(rows),
      fileName: `cafe-operational-report-${monthString}.csv`,
    };
  }

  if (params.format === "xlsx") {
    return {
      format: "xlsx",
      data: await generateExcel(rows),
      fileName: `cafe-operational-report-${monthString}.xlsx`,
    };
  }

  if (params.format === "pdf") {
    return {
      format: "pdf",
      data: await generatePdf(rows, `Cafe Operational Report - ${monthString}`),
      fileName: `cafe-operational-report-${monthString}.pdf`,
    };
  }

  return {
    format: "json",
    data: {
      month: monthString,
      metrics: rows,
    },
  };
};
