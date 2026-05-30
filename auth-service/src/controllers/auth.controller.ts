import { Response, Request, NextFunction } from "express";
import { IUser, Role } from "../models/user.model";
import { ValidationError, ResponseHelper } from "../utils";
import { sendOtp } from "../services/otp.service";
import {
    verifyOtpService,
    loginService,
    refreshTokenService,
    logoutService,
} from "../services/auth.service";
import {
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPasswordService,
} from "../services/forgot-password.service";

// Cookie options — HttpOnly + Secure + SameSite=Strict
const REFRESH_TOKEN_COOKIE = "refreshToken";
const COOKIE_OPTIONS = {
    httpOnly: true, // JS không đọc được → chống XSS
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict" as const, // chống CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (ms)
    path: "/api/v1/auth", // chỉ gửi cookie cho auth routes
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { fullname, email, password, role } = req.body as IUser;
        console.log("🚀 ~ register ~ role:", role);
        const validationErrors: Record<string, string> = {};
        if (!fullname) {
            validationErrors.fullname = "Fullname is required";
        }
        if (!email) {
            validationErrors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                validationErrors.email = "Please provide a valid email address";
            }
        }
        if (!password) {
            validationErrors.password = "Password is required";
        } else if (password.length < 8) {
            validationErrors.password =
                "Password must be at least 8 characters";
        }
        const validRoles = Object.values(Role); // ["user", "admin", "worker"]
        if (!role) {
            validationErrors.role = "Role is required";
        } else if (!validRoles.includes(role as Role)) {
            validationErrors.role = `Role must be one of: ${validRoles.join(", ")}`;
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError("Validation failed", validationErrors);
        }

        await sendOtp({ fullname, email, password, role });

        ResponseHelper.created(res, null, "OTP sent to your email");
    } catch (error) {
        next(error);
    }
};

export const verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, otp } = req.body;

        if (!email)
            throw new ValidationError("Validation failed", {
                email: "Email is required",
            });
        if (!otp)
            throw new ValidationError("Validation failed", {
                otp: "OTP is required",
            });
        if (otp.length !== 4)
            throw new ValidationError("Validation failed", {
                otp: "OTP must be 4 digits",
            });

        const user = await verifyOtpService({ email, otp });

        ResponseHelper.created(res, { user }, "Registration successful");
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot Password — Step 1: request OTP
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email } = req.body;
        if (!email)
            throw new ValidationError("Validation failed", {
                email: "Email is required",
            });

        await sendForgotPasswordOtp(email);

        // Always the same message — never reveal if email exists
        ResponseHelper.ok(
            res,
            null,
            "If this email is registered, an OTP has been sent.",
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot Password — Step 2: verify OTP → receive reset token
 * @route POST /api/auth/forgot-password/verify-otp
 */
export const verifyFpOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, otp } = req.body;

        if (!email)
            throw new ValidationError("Validation failed", {
                email: "Email is required",
            });
        if (!otp)
            throw new ValidationError("Validation failed", {
                otp: "OTP is required",
            });
        if (String(otp).length !== 4)
            throw new ValidationError("Validation failed", {
                otp: "OTP must be 4 digits",
            });

        const resetToken = await verifyForgotPasswordOtp(email, String(otp));

        ResponseHelper.ok(
            res,
            { resetToken },
            "OTP verified. Change your password now.",
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot Password — Step 3: reset password with token
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken)
            throw new ValidationError("Validation failed", {
                resetToken: "Reset token is required",
            });
        if (!newPassword)
            throw new ValidationError("Validation failed", {
                newPassword: "New password is required",
            });
        else if (newPassword.length < 8)
            throw new ValidationError("Validation failed", {
                newPassword: "Password must be at least 8 characters",
            });

        await resetPasswordService(resetToken, newPassword);

        ResponseHelper.ok(
            res,
            null,
            "Password has been reset successfully. Please log in.",
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Login
 * @route POST /api/auth/login
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, password } = req.body;

        const validationErrors: Record<string, string> = {};
        if (!email) validationErrors.email = "Email is required";
        if (!password) validationErrors.password = "Password is required";
        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError("Validation failed", validationErrors);
        }

        const result = await loginService({ email, password });

        // Đặt Refresh Token vào HttpOnly Cookie
        res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

        // Trả Access Token trong body (FE lưu vào memory)
        ResponseHelper.ok(
            res,
            { accessToken: result.accessToken, user: result.user },
            "Login successful",
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh Access Token
 * @route POST /api/auth/refresh-token
 */
export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
        if (!token) {
            throw new ValidationError("Validation failed", {
                refreshToken: "Refresh token cookie is missing.",
            });
        }

        const result = await refreshTokenService(token);

        // Cấp lại refresh token mới qua cookie (rotation)
        res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

        ResponseHelper.ok(
            res,
            { accessToken: result.accessToken },
            "Token refreshed",
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 * @route POST /api/auth/logout
 * Yêu cầu: authenticate middleware đã attach req.user
 */
export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.userId;
        if (userId) {
            await logoutService(userId);
        }

        // Xóa cookie phía client
        res.clearCookie(REFRESH_TOKEN_COOKIE, {
            ...COOKIE_OPTIONS,
            maxAge: 0,
        });

        ResponseHelper.ok(res, null, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};
