export interface IMailData {
    email: string;
    subject: string;
    body: string;
    from: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    message?: string;
    data?: T;
    errors?: Record<string, string>;
    timestamp: string;
}
