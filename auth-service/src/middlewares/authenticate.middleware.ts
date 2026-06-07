import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ITokenPayload } from "../services/auth.service";
import { UnauthorizedError } from "../utils";

const JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || "dwth_access_secret_change_in_production";

// Extend Express Request để attach user info
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
 * Middleware: Verify Access Token từ Authorization header.
 * Header format: "Authorization: Bearer <accessToken>"
 * Attach { userId, email, role } vào req.user cho các route sau.
 */
export const authenticate = (
    req: Request,
    _res: Response,
    next: NextFunction,
): void => {
    try {
        // 1) If gateway forwarded user info in headers, trust and attach
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
            throw new UnauthorizedError(
                "Access token is missing. Please log in.",
            );
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(token, JWT_ACCESS_SECRET) as ITokenPayload;

        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        };

        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
        } else {
            // JWT verify threw (expired, invalid signature, etc.)
            next(new UnauthorizedError("Access token is invalid or expired."));
        }
    }
};

/**
 * Middleware: Authorize by role.
 * Dùng sau authenticate middleware.
 * @example router.get("/admin", authenticate, authorize("admin"), handler)
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new UnauthorizedError("Not authenticated."));
        }
        if (!allowedRoles.includes(req.user.role)) {
            next(
                Object.assign(
                    new UnauthorizedError(
                        "You do not have permission to access this resource.",
                    ),
                    { statusCode: 403 },
                ),
            );
        } else {
            next();
        }
    };
};
