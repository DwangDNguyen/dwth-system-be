import { Response } from "express";
import { ApiResponse } from "../types/response.types";
import { HTTP_STATUS } from "../constants/http-status";

/**
 * Chỉ dùng cho SUCCESS responses.
 * Với lỗi → throw custom error class (BadRequestError, NotFoundError, ...)
 * → global errorHandler tự bắt và gửi response.
 */
export class ResponseHelper {
    static ok<T>(res: Response, data?: T, message?: string): void {
        ResponseHelper.send(res, HTTP_STATUS.OK, message, data);
    }

    static created<T>(res: Response, data?: T, message?: string): void {
        ResponseHelper.send(res, HTTP_STATUS.CREATED, message, data);
    }

    private static send<T>(
        res: Response,
        statusCode: number,
        message?: string,
        data?: T,
    ): void {
        const body: ApiResponse<T> = {
            success: true,
            statusCode,
            message,
            timestamp: new Date().toISOString(),
        };
        if (data !== undefined) body.data = data;
        res.status(statusCode).json(body);
    }
}
