import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Role, User } from "../models/user.model";
import {
    OtpExpiredError,
    OtpInvalidError,
    InvalidCredentialsError,
    TooManyRequestsError,
    UnauthorizedError,
} from "../utils";
import {
    getOtp,
    getPendingUser,
    deleteOtp,
    deletePendingUser,
    setRefreshToken,
    getRefreshToken,
    deleteRefreshToken,
    incrementLoginAttempts,
    isLoginLocked,
    deleteLoginAttempts,
} from "./otp.cache";

// ─── JWT Config ───────────────────────────────────────────────────────────────
const JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || "dwth_access_secret_change_in_production";
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ||
    "dwth_refresh_secret_change_in_production";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// Pre-computed dummy hash để tránh timing attack (chạy 1 lần khi module load)
const DUMMY_HASH =
    "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

// ─── Token Helpers ────────────────────────────────────────────────────────────

export interface ITokenPayload {
    userId: string;
    email: string;
    role: string;
    jti: string;
}

const generateAccessToken = (payload: Omit<ITokenPayload, "jti">): string => {
    const jti = crypto.randomBytes(8).toString("hex");
    return jwt.sign({ ...payload, jti }, JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
};

const generateRefreshToken = (
    userId: string,
): { token: string; jti: string } => {
    const jti = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign({ userId, jti }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
    return { token, jti };
};

export interface IUserData {
    fullname: string;
    email: string;
    password: string;
    role: Role;
}

export interface IVerifyOtpData {
    email: string;
    otp: string;
}

export const verifyOtpService = async (data: IVerifyOtpData) => {
    const { email, otp } = data;

    // 1. Lấy OTP từ Redis
    const cachedOtp = await getOtp(email);
    if (!cachedOtp) {
        throw new OtpExpiredError();
    }

    // 2. So sánh OTP
    if (cachedOtp !== otp) {
        throw new OtpInvalidError();
    }

    // 3. Lấy thông tin user tạm từ Redis
    const pendingUser = await getPendingUser(email);
    if (!pendingUser) {
        throw new OtpExpiredError();
    }

    // 4. Lưu user thật vào MongoDB (lần đầu tiên)
    const newUser = await User.create({
        fullname: pendingUser.fullname,
        email: pendingUser.email,
        password: pendingUser.hashedPassword,
        role: pendingUser.role,
    });

    // 5. Cleanup Redis
    await Promise.all([deleteOtp(email), deletePendingUser(email)]);

    return {
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role,
    };
};

// ─── Login ────────────────────────────────────────────────────────────────────

export interface ILoginData {
    email: string;
    password: string;
}

export const loginService = async (data: ILoginData) => {
    const { email, password } = data;

    // 1. Brute-force protection: kiểm tra trước khi query DB
    const locked = await isLoginLocked(email);
    if (locked) {
        throw new TooManyRequestsError(
            "Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
        );
    }

    // 2. Query user từ DB
    const user = await User.findOne({ email }).select("+password");

    // 3. Luôn chạy bcrypt dù user null → tránh timing attack
    //    Nếu user null, compare với DUMMY_HASH → luôn false, nhưng mất thời gian như thật
    const hashToCompare = user?.password ?? DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
        // Chỉ increment attempts khi thực sự sai (không phải khi user null giả)
        if (user) await incrementLoginAttempts(email);
        throw new InvalidCredentialsError();
    }

    // 4. Login thành công → reset brute-force counter
    await deleteLoginAttempts(email);

    // 5. Generate tokens
    const userId = (user._id as any).toString();
    const accessToken = generateAccessToken({
        userId,
        email: user.email,
        role: user.role,
    });
    const { token: refreshToken, jti } = generateRefreshToken(userId);

    // 6. Lưu refresh token jti vào Redis (ghi đè session cũ — single session)
    await setRefreshToken(userId, jti);

    return {
        accessToken,
        refreshToken,
        user: {
            id: userId,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
        },
    };
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshTokenService = async (refreshToken: string) => {
    // 1. Verify JWT signature + expiry
    let payload: { userId: string; jti: string };
    try {
        payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
            userId: string;
            jti: string;
        };
    } catch {
        throw new UnauthorizedError("Refresh token is invalid or expired.");
    }

    const { userId, jti } = payload;

    // 2. Kiểm tra jti còn trong Redis không (đã logout/revoke chưa)
    const storedJti = await getRefreshToken(userId);
    if (!storedJti || storedJti !== jti) {
        // Token reuse detected → có thể bị đánh cắp, xóa toàn bộ session
        await deleteRefreshToken(userId);
        throw new UnauthorizedError("Refresh token has been revoked.");
    }

    // 3. Lấy user từ DB để đảm bảo user còn tồn tại
    const user = await User.findById(userId);
    if (!user) {
        await deleteRefreshToken(userId);
        throw new UnauthorizedError("User no longer exists.");
    }

    // 4. Token Rotation: tạo cặp token mới + thu hồi token cũ
    const newAccessToken = generateAccessToken({
        userId,
        email: user.email,
        role: user.role,
    });
    const { token: newRefreshToken, jti: newJti } =
        generateRefreshToken(userId);

    // 5. Cập nhật jti mới vào Redis (token cũ tự động vô hiệu)
    await setRefreshToken(userId, newJti);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutService = async (userId: string): Promise<void> => {
    // Xóa refresh token khỏi Redis → token cũ không dùng được nữa
    await deleteRefreshToken(userId);
};
