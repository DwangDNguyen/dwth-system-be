import { Router } from "express";
import {
    register,
    verifyOtp,
    forgotPassword,
    verifyFpOtp,
    resetPassword,
    login,
    refreshToken,
    logout,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();

// ─── Registration ─────────────────────────────────────────────────────────────
router.post("/register", register);
router.post("/verify-otp", verifyOtp);

// ─── Authentication ───────────────────────────────────────────────────────────
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", authenticate, logout); // authenticate: cần Access Token

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password/verify-otp", verifyFpOtp);
router.post("/reset-password", resetPassword);

export default router;
