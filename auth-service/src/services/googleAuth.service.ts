import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { Role, User } from "../models/user.model";
import { authUserProducer } from "../producers/user.producer";
import { setRefreshToken } from "./otp.cache";
import logger from "../utils/logger";
import { UnauthorizedError } from "../utils";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const getJwtAccessSecret = () =>
    process.env.JWT_ACCESS_SECRET || "dwth_access_secret_change_in_production";
const getJwtRefreshSecret = () =>
    process.env.JWT_REFRESH_SECRET || "dwth_refresh_secret_change_in_production";

/**
 * Verify Google Credential (ID Token or OAuth2 Access Token)
 */
export const verifyGoogleToken = async (token: string) => {
    try {
        if (token.startsWith("ey")) {
            // JWT ID Token
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new UnauthorizedError("Invalid Google ID Token payload");
            }
            return {
                googleId: payload.sub,
                email: payload.email,
                fullname: payload.name || payload.email.split("@")[0],
                avatar: payload.picture || "",
            };
        } else {
            // OAuth2 Access Token
            const userInfoRes = await axios.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = userInfoRes.data;
            if (!data || !data.email) {
                throw new UnauthorizedError("Invalid Google UserInfo payload");
            }
            return {
                googleId: data.sub,
                email: data.email,
                fullname: data.name || data.email.split("@")[0],
                avatar: data.picture || "",
            };
        }
    } catch (error: any) {
        const detail =
            error?.response?.data?.error_description ||
            error?.response?.data?.error ||
            error?.message ||
            String(error);
        logger.error("Google token verification failed", { error: detail });
        throw new UnauthorizedError(`Google Authentication failed: ${detail}`);
    }
};

/**
 * Authenticate or register user via Google OAuth
 */
export const googleLoginService = async (idToken: string) => {
    // 1. Verify token with Google
    const googleUser = await verifyGoogleToken(idToken);
    const { googleId, email, fullname, avatar } = googleUser;

    // 2. Find or Create User in Auth DB
    let user = await User.findOne({ email });

    if (!user) {
        // Create new user account via Google provider
        user = await User.create({
            fullname,
            email,
            password: "",
            role: Role.USER,
            googleId,
            authProvider: "google",
        });

        // Publish user.created event to Kafka for user-service profile creation
        try {
            await authUserProducer.publishUserCreated({
                authUserId: user._id.toString(),
                fullname: user.fullname,
                email: user.email,
                role: user.role,
            });
        } catch (kafkaError) {
            logger.error("Failed to publish Google user created event to Kafka", {
                userId: user._id.toString(),
                error: kafkaError instanceof Error ? kafkaError.message : String(kafkaError),
            });
        }
    } else if (!user.googleId) {
        // Link Google ID if user registered with local email previously
        user.googleId = googleId;
        user.authProvider = user.authProvider || "google";
        await user.save();
    }

    // 3. Issue Tokens
    const userId = (user._id as any).toString();
    const jtiAccess = crypto.randomBytes(8).toString("hex");
    const accessToken = jwt.sign(
        { userId, email: user.email, role: user.role, jti: jtiAccess },
        getJwtAccessSecret(),
        { expiresIn: "15m" }
    );

    const jtiRefresh = crypto.randomBytes(16).toString("hex");
    const refreshToken = jwt.sign(
        { userId, jti: jtiRefresh },
        getJwtRefreshSecret(),
        { expiresIn: "7d" }
    );

    // Save refresh token jti to Redis session
    await setRefreshToken(userId, jtiRefresh);

    return {
        accessToken,
        refreshToken,
        user: {
            id: userId,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            avatar,
        },
    };
};
