import { AppError } from "../utils/AppError.js";
import { removeUploadedFile } from "./upload.middleware.js";

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  removeUploadedFile(req.file);

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    data: null,
  });
};
