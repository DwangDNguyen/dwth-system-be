import { getRedisClient } from "../config/redis.config";

const OTP_TTL = 5 * 60; // 5 phút
const PENDING_TTL = 10 * 60; // 10 phút
const FP_OTP_TTL = 5 * 60; // forgot-password OTP: 5 phút
const FP_TOKEN_TTL = 10 * 60; // reset JWT token: 10 phút
const FP_RATELIMIT_TTL = 15 * 60; // rate limit window: 15 phút
const FP_ATTEMPTS_TTL = 5 * 60; // brute-force attempts: 5 phút (bằng OTP TTL)

const MAX_FP_REQUESTS = 3; // tối đa 3 lần gửi OTP / 15 phút
const MAX_FP_ATTEMPTS = 5; // tối đa 5 lần nhập sai OTP

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // refresh token: 7 ngày
const LOGIN_ATTEMPTS_TTL = 15 * 60; // login brute-force window: 15 phút
const MAX_LOGIN_ATTEMPTS = 5; // tối đa 5 lần sai / 15 phút

export interface IPendingUser {
    fullname: string;
    email: string;
    hashedPassword: string;
    role: string;
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export const setOtp = async (email: string, otp: string): Promise<void> => {
    const client = getRedisClient();
    await client.set(`otp:${email}`, otp, { EX: OTP_TTL });
};

export const getOtp = async (email: string): Promise<string | null> => {
    const client = getRedisClient();
    return client.get(`otp:${email}`);
};

export const deleteOtp = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`otp:${email}`);
};

// ─── Pending User ─────────────────────────────────────────────────────────────

export const setPendingUser = async (
    email: string,
    data: IPendingUser,
): Promise<void> => {
    const client = getRedisClient();
    await client.set(`pending:${email}`, JSON.stringify(data), {
        EX: PENDING_TTL,
    });
};

export const getPendingUser = async (
    email: string,
): Promise<IPendingUser | null> => {
    const client = getRedisClient();
    const raw = await client.get(`pending:${email}`);
    return raw ? (JSON.parse(raw) as IPendingUser) : null;
};

export const deletePendingUser = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`pending:${email}`);
};

// ─── Forgot Password OTP ──────────────────────────────────────────────────────

export const setFpOtp = async (email: string, otp: string): Promise<void> => {
    const client = getRedisClient();
    await client.set(`fp_otp:${email}`, otp, { EX: FP_OTP_TTL });
};

export const getFpOtp = async (email: string): Promise<string | null> => {
    const client = getRedisClient();
    return client.get(`fp_otp:${email}`);
};

export const deleteFpOtp = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`fp_otp:${email}`);
};

// ─── Forgot Password Reset Token (JWT stored for single-use revocation) ───────

export const setFpToken = async (email: string, jti: string): Promise<void> => {
    const client = getRedisClient();
    await client.set(`fp_token:${email}`, jti, { EX: FP_TOKEN_TTL });
};

export const getFpToken = async (email: string): Promise<string | null> => {
    const client = getRedisClient();
    return client.get(`fp_token:${email}`);
};

export const deleteFpToken = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`fp_token:${email}`);
};

// ─── Rate Limit (max OTP sends per 15 min) ────────────────────────────────────

/**
 * Increment rate-limit counter.
 * Returns the new count after increment.
 */
export const incrementFpRateLimit = async (email: string): Promise<number> => {
    const client = getRedisClient();
    const key = `fp_ratelimit:${email}`;
    const count = await client.incr(key);
    if (count === 1) {
        // first request — set the window TTL
        await client.expire(key, FP_RATELIMIT_TTL);
    }
    return count;
};

export const isFpRateLimited = async (email: string): Promise<boolean> => {
    const count = await incrementFpRateLimit(email);
    return count > MAX_FP_REQUESTS;
};

// ─── Brute-force OTP Attempt Protection ──────────────────────────────────────

/**
 * Increment wrong-OTP attempt counter.
 * Returns true if the max attempts have been exceeded.
 */
export const incrementFpAttempts = async (email: string): Promise<number> => {
    const client = getRedisClient();
    const key = `fp_attempts:${email}`;
    const count = await client.incr(key);
    if (count === 1) {
        await client.expire(key, FP_ATTEMPTS_TTL);
    }
    return count;
};

export const isFpAttemptsExceeded = async (email: string): Promise<boolean> => {
    const client = getRedisClient();
    const raw = await client.get(`fp_attempts:${email}`);
    return raw !== null && parseInt(raw, 10) >= MAX_FP_ATTEMPTS;
};

export const deleteFpAttempts = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`fp_attempts:${email}`);
};

// ─── Refresh Token (single-session: 1 user → 1 refresh token) ────────────────

/**
 * Lưu jti của refresh token vào Redis.
 * Key: "refresh:{userId}" — ghi đè session cũ (single-session).
 */
export const setRefreshToken = async (
    userId: string,
    jti: string,
): Promise<void> => {
    const client = getRedisClient();
    await client.set(`refresh:${userId}`, jti, { EX: REFRESH_TOKEN_TTL });
};

export const getRefreshToken = async (
    userId: string,
): Promise<string | null> => {
    const client = getRedisClient();
    return client.get(`refresh:${userId}`);
};

export const deleteRefreshToken = async (userId: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`refresh:${userId}`);
};

// ─── Login Brute-Force Protection ─────────────────────────────────────────────

/**
 * Increment login-failure counter.
 * Returns the new count after increment.
 */
export const incrementLoginAttempts = async (
    email: string,
): Promise<number> => {
    const client = getRedisClient();
    const key = `login_attempts:${email}`;
    const count = await client.incr(key);
    if (count === 1) {
        await client.expire(key, LOGIN_ATTEMPTS_TTL);
    }
    return count;
};

export const isLoginLocked = async (email: string): Promise<boolean> => {
    const client = getRedisClient();
    const raw = await client.get(`login_attempts:${email}`);
    return raw !== null && parseInt(raw, 10) >= MAX_LOGIN_ATTEMPTS;
};

export const deleteLoginAttempts = async (email: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(`login_attempts:${email}`);
};
