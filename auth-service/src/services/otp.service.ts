import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import axios from "axios";
import { DuplicateEmailError } from "../utils";
import { User } from "../models/user.model";
import { generateOtpMailTemplate } from "../template/mail.template";
import { setOtp, setPendingUser, IPendingUser } from "./otp.cache";
import { IUserData } from "./auth.service";

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

    // 5. Gửi mail OTP
    const mailData = {
        email,
        subject: "Your OTP for Registration – Dwth System",
        body: generateOtpMailTemplate(otpCode),
        from: "Admin",
    };
    try {
        await axios.post("http://localhost:5000/api/v1/send-mail", mailData);
    } catch (mailError: any) {
        console.warn(
            "⚠ Mail service unavailable, OTP was not sent:",
            mailError?.code ?? mailError?.message,
        );
    }
};
