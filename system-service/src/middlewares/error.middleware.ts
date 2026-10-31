import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `${req.method} ${req.path} - Route not found`,
    timestamp: new Date().toISOString(),
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || (err.name === "ValidationError" ? 400 : 500);
  const message = err.message || "Internal server error";

  logger.error("System Service Error", {
    path: req.path,
    method: req.method,
    statusCode,
    message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors,
    timestamp: new Date().toISOString(),
  });
};
