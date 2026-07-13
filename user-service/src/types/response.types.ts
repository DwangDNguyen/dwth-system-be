/**
 * Standard API Response Format
 * Used for ALL responses (success and error)
 *
 * Success: { success: true, statusCode: 200, data: T, message?, timestamp }
 * Error: { success: false, statusCode: 4xx/5xx, message, errors?, timestamp }
 */
export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    message?: string;
    data?: T;
    errors?: Record<string, string>;
    timestamp: string;
}
