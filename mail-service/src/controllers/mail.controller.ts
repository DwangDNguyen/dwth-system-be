import { Request, Response } from "express";
import { ApiResponse, IMailData } from "../types";
import { HTTP_STATUS } from "../constants/http-status";
import { sendMailService } from "../services/mail.service";
import { AppError } from "../utils/base.error";

export const sendMail = async (req: Request, res: Response) => {
    try {
        const { email, subject, body, from } = req.body as IMailData;
        if (!email || !subject || !body || !from) {
            throw new AppError(
                "Please provide all required fields",
                HTTP_STATUS.BAD_REQUEST,
            );
        }
        await sendMailService({ email, subject, body, from });
        res.status(HTTP_STATUS.OK).json({
            success: true,
            statusCode: HTTP_STATUS.CREATED,
            message: "OTP sent to your email",
            timestamp: new Date().toISOString(),
        } as ApiResponse<null>);
    } catch (error: any) {
        throw new AppError(
            error.message || "Failed to send email",
            error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
    }
};
