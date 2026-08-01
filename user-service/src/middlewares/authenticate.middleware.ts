import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/base.error";
import { HTTP_STATUS } from "../constants/http-status";



export interface IJwtPayload {
    userId: string;
    email: string;
    role: string;
    jti?: string;
}

// Extend Express Request interface globally to attach authenticated user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Middleware: Verify Access Token from Authorization header or API Gateway headers.
 * Header format: "Authorization: Bearer <accessToken>"
 * Attaches { userId, email, role } to req.user for downstream handlers.
 */
export const authenticate = (
    req: Request,
    _res: Response,
    next: NextFunction,
): void => {
    try {
        // 1) If API Gateway forwarded user info in headers, trust and attach
        const forwardedUserId = req.headers["x-user-id"] as string | undefined;
        const forwardedEmail = req.headers["x-user-email"] as
            | string
            | undefined;
        const forwardedRole = req.headers["x-user-role"] as string | undefined;

        if (forwardedUserId && forwardedEmail && forwardedRole) {
            req.user = {
                userId: forwardedUserId,
                email: forwardedEmail,
                role: forwardedRole,
            };
            next();
            return;
        }

        // 2) Fallback: verify Authorization Bearer token (direct service call)
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError(
                "Access token is missing. Please log in.",
                HTTP_STATUS.UNAUTHORIZED,
            );
        }

        const token = authHeader.split(" ")[1];
        const secret =
            process.env.JWT_ACCESS_SECRET || "dwth_access_secret_change_in_production";
        const payload = jwt.verify(token, secret) as IJwtPayload;

        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(
                new AppError(
                    "Access token is invalid or expired.",
                    HTTP_STATUS.UNAUTHORIZED,
                ),
            );
        }
    }
};

/**
 * Middleware: Authorize by role (RBAC).
 * Must be used AFTER authenticate middleware.
 * @example router.get("/admin", authenticate, authorize("Admin"), handler)
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(
                new AppError("Not authenticated.", HTTP_STATUS.UNAUTHORIZED),
            );
        }

        const userRole = req.user.role ? req.user.role.toUpperCase() : "";
        const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

        if (!normalizedAllowedRoles.includes(userRole)) {
            next(
                new AppError(
                    "You do not have permission to access this resource.",
                    HTTP_STATUS.FORBIDDEN,
                ),
            );
        } else {
            next();
        }
    };
};
