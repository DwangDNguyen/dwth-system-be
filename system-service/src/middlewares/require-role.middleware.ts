import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedSystemRequest extends Request {
  userRole?: string;
  userId?: string;
  userEmail?: string;
}

export const extractUserContext = (
  req: AuthenticatedSystemRequest,
  _res: Response,
  next: NextFunction
): void => {
  // 1. Check Gateway injected headers
  const headerRole = req.headers["x-user-role"] as string | undefined;
  const headerUserId = req.headers["x-user-id"] as string | undefined;
  const headerEmail = req.headers["x-user-email"] as string | undefined;

  if (headerRole) {
    req.userRole = headerRole.toLowerCase();
    req.userId = headerUserId;
    req.userEmail = headerEmail;
    return next();
  }

  // 2. Direct Bearer token fallback (e.g. direct service call or testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const secret =
      process.env.JWT_ACCESS_SECRET ||
      "5e064743787fb7f043e596c60f1b11205a9c9e0b944ad8e0038042fa6117f826";
    try {
      const decoded = jwt.verify(token, secret) as any;
      if (decoded?.role) {
        req.userRole = String(decoded.role).toLowerCase();
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
      }
    } catch {
      // Ignored, will be handled by requireRole or fallback
    }
  }

  next();
};

export const requireAdmin = (
  req: AuthenticatedSystemRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== "admin") {
    res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Forbidden: You do not have permission to access this resource",
    });
    return;
  }
  next();
};
