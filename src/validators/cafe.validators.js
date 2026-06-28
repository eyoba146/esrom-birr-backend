import { AppError } from "../utils/AppError.js";
import {
  optionalString,
  requireString,
  toMoney,
  toPositiveInt,
  validateFormat,
  validateMonth,
} from "./common.validators.js";

const parseBoolean = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new AppError(`${fieldName} must be true or false`, 400);
};

export const validateMenuItemCreate = (body) => ({
  name: requireString(body.name, "name", 150),
  description: optionalString(body.description, "description", 1000) ?? null,
  price: toMoney(body.price, "price"),
  is_available: parseBoolean(body.is_available, "is_available") ?? true,
});

export const validateMenuItemUpdate = (body) => {
  const payload = {};

  if (body.name !== undefined) payload.name = requireString(body.name, "name", 150);
  if (body.description !== undefined) {
    payload.description = optionalString(body.description, "description", 1000) ?? null;
  }
  if (body.price !== undefined) payload.price = toMoney(body.price, "price");
  if (body.is_available !== undefined) {
    payload.is_available = parseBoolean(body.is_available, "is_available");
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError("At least one field is required", 400);
  }

  return payload;
};

export const validateAvailability = (body) => ({
  is_available: (() => {
    const value = parseBoolean(body.is_available, "is_available");
    if (value === undefined) throw new AppError("is_available is required", 400);
    return value;
  })(),
});

export const validateMenuItemId = (params) => toPositiveInt(params.id, "menu item id");

export const validateCafeReportQuery = (query) => ({
  month: validateMonth(query.month),
  format: validateFormat(query.format),
});

export const validateCafeAnalyticsQuery = (query) => ({
  month: validateMonth(query.month),
});
