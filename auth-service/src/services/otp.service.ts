import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import axios from "axios";
import logger from "../utils/logger";
import { DuplicateEmailError } from "../utils";
import { User } from "../models/user.model";
import { generateOtpMailTemplate } from "../template/mail.template";
import { setOtp, setPendingUser, IPendingUser } from "./otp.cache";
import { IUserData } from "./auth.service";
import { authMailProducer } from "./kafka.mail.producer";

const SALT_ROUNDS = 10;

// ─── Generate & lưu OTP vào Redis ────────────────────────────────────────────
const generateOTP = (): string => {
    return otpGenerator.generate(4, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });
};

// ─── sendOtp: validate → lưu pending user + OTP vào Redis → gửi mail ─────────
export const sendOtp = async (data: IUserData): Promise<void> => {
    const { fullname, email, password, role } = data;

    // 1. Kiểm tra email đã tồn tại trong DB chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new DuplicateEmailError(email);
    }

    // 2. Hash password trước khi lưu tạm
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Lưu thông tin user tạm vào Redis (TTL 10 phút)
    const pendingUser: IPendingUser = { fullname, email, hashedPassword, role };
    await setPendingUser(email, pendingUser);

    // 4. Generate OTP và lưu vào Redis (TTL 5 phút)
    const otpCode = generateOTP();
    await setOtp(email, otpCode);

    // 5. Gửi mail OTP - Dual delivery: HTTP + Kafka
    const OTP_EXPIRES_IN = 300; // 5 minutes
    const mailData = {
        email,
        subject: "Your OTP for Registration – Dwth System",
        body: generateOtpMailTemplate(otpCode),
        from: "Admin",
    };

    // ─── Synchronous HTTP delivery (primary) ───────────────────────────────────
    try {
        await axios.post("http://localhost:3002/api/v1/send-mail", mailData, {
            timeout: 5000,
        });
        logger.info("OTP registration email sent via HTTP", { email });
    } catch (httpError: any) {
        logger.warn("HTTP mail service unavailable, falling back to Kafka", {
            email,
            error: httpError?.code ?? httpError?.message,
        });

        // ─── Asynchronous Kafka delivery (fallback) ───────────────────────────────
        try {
            await authMailProducer.sendOtpRegistration({
                email,
                fullname,
                otp: otpCode,
                expiresIn: OTP_EXPIRES_IN,
            });
            logger.info("OTP registration event published to Kafka (fallback)", { email });
        } catch (kafkaError) {
            logger.error("Failed to deliver OTP registration via both HTTP and Kafka", {
                email,
                httpError: httpError?.message,
                kafkaError: kafkaError instanceof Error ? kafkaError.message : String(kafkaError),
            });
            // Continue anyway - OTP is stored in Redis, user can request new one
        }
    }
};
