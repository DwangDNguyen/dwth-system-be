import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";



const PUBLIC_PATHS = new Set([
    "/api/v1/auth/login",
    "/api/v1/auth/google",
    "/api/v1/auth/refresh-token",
    "/api/v1/auth/register",
    "/api/v1/auth/verify-otp",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/forgot-password/verify-otp",
    "/api/v1/auth/reset-password",
]);

interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): void => {
    const url = req.originalUrl.split("?")[0];

    if (req.method === "OPTIONS" || PUBLIC_PATHS.has(url)) {
        next();
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Access token is missing. Please log in.",
        });
        return;
    }

    const token = authHeader.split(" ")[1];
    const secret =
        process.env.JWT_ACCESS_SECRET || "dwth_access_secret_change_in_production";

    try {
        const payload = jwt.verify(token, secret) as JwtPayload & {
            userId?: string;
            email?: string;
            role?: string;
        };

        if (!payload?.userId || !payload?.email || !payload?.role) {
            res.status(401).json({
                message: "Access token is invalid or expired.",
            });
            return;
        }

        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        };

        next();
    } catch (error) {
        res.status(401).json({
            message: "Access token is invalid or expired.",
        });
    }
};
