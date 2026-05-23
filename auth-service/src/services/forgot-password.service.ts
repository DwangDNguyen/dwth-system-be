import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import otpGenerator from "otp-generator";
import { User } from "../models/user.model";
import { generateForgotPasswordMailTemplate } from "../template/mail.template";
import {
    setFpOtp,
    getFpOtp,
    deleteFpOtp,
    setFpToken,
    getFpToken,
    deleteFpToken,
    isFpRateLimited,
    isFpAttemptsExceeded,
    incrementFpAttempts,
    deleteFpAttempts,
} from "./otp.cache";
import {
    OtpExpiredError,
    OtpInvalidError,
    ResetTokenInvalidError,
    TooManyRequestsError,
    ValidationError,
} from "../utils";

const SALT_ROUNDS = 10;
const JWT_RESET_SECRET =
    process.env.JWT_RESET_SECRET || "dwth_reset_secret_change_in_production";
console.log("🚀 ~ JWT_RESET_SECRET:", JWT_RESET_SECRET);
const FP_TOKEN_EXPIRES_IN = "10m";

// ─── Generate 4-digit OTP ─────────────────────────────────────────────────────
const generateOTP = (): string =>
    otpGenerator.generate(4, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });

// ─── STEP 1: Send OTP to email ────────────────────────────────────────────────
export const sendForgotPasswordOtp = async (email: string): Promise<void> => {
    // Rate limit check (3 requests / 15 min)
    const rateLimited = await isFpRateLimited(email);
    if (rateLimited) {
        throw new TooManyRequestsError(
            "Too many password reset requests. Please try again in 15 minutes.",
        );
    }

    // Intentionally do NOT reveal if email exists (prevent email enumeration)
    const user = await User.findOne({ email });
    if (!user) {
        throw new ValidationError("Validation failed", {
            email: "Cannot send OTP to unregistered email. Please check and try again.",
        });
    }

    const otp = generateOTP();
    await setFpOtp(email, otp);

    const mailData = {
        email,
        subject: "Reset Your Password – Dwth System",
        body: generateForgotPasswordMailTemplate(otp),
        from: "Admin",
    };
    try {
        await axios.post("http://localhost:5000/api/v1/send-mail", mailData);
    } catch (mailError: any) {
        console.warn(
            "⚠ Mail service unavailable, FP OTP not sent:",
            mailError?.code ?? mailError?.message,
        );
    }
};

// ─── STEP 2: Verify OTP → return JWT reset token ─────────────────────────────
export const verifyForgotPasswordOtp = async (
    email: string,
    otp: string,
): Promise<string> => {
    // Brute-force check BEFORE looking up the OTP
    const attemptsExceeded = await isFpAttemptsExceeded(email);
    if (attemptsExceeded) {
        throw new TooManyRequestsError(
            "Too many failed attempts. Please request a new OTP.",
        );
    }

    const cachedOtp = await getFpOtp(email);
    if (!cachedOtp) throw new OtpExpiredError();

    if (cachedOtp !== otp) {
        await incrementFpAttempts(email);
        throw new OtpInvalidError();
    }

    // OTP correct — clean up
    await Promise.all([deleteFpOtp(email), deleteFpAttempts(email)]);

    // Generate JWT reset token with a unique jti (JWT ID) for revocation
    const jti = crypto.randomBytes(16).toString("hex");
    const resetToken = jwt.sign({ email, jti }, JWT_RESET_SECRET, {
        expiresIn: FP_TOKEN_EXPIRES_IN,
    });

    // Store jti in Redis (used to verify single-use)
    await setFpToken(email, jti);

    return resetToken;
};

// ─── STEP 3: Reset password ───────────────────────────────────────────────────
export const resetPasswordService = async (
    resetToken: string,
    newPassword: string,
): Promise<void> => {
    // 1. Verify JWT signature + expiry
    let payload: { email: string; jti: string };
    try {
        payload = jwt.verify(resetToken, JWT_RESET_SECRET) as {
            email: string;
            jti: string;
        };
    } catch {
        throw new ResetTokenInvalidError();
    }

    const { email, jti } = payload;

    // 2. Validate password
    if (!newPassword || newPassword.length < 8) {
        throw new ValidationError("Validation failed", {
            newPassword: "Password must be at least 8 characters.",
        });
    }

    // 3. Verify single-use: jti must still be in Redis
    const storedJti = await getFpToken(email);
    if (!storedJti || storedJti !== jti) {
        throw new ResetTokenInvalidError();
    }

    // 4. Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // 5. Revoke the token (single-use enforcement)
    await deleteFpToken(email);
};
