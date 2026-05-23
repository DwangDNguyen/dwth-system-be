export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
    NETWORK_ERROR: "Network error. Please check your internet connection.",
    TIMEOUT: "Request timeout. Please try again.",
    UNAUTHORIZED: "Session expired. Please login again.",
    FORBIDDEN: "You do not have permission to access this resource.",
    NOT_FOUND: "Resource not found.",
    SERVER_ERROR: "Server error. Please try again later.",
    UNKNOWN: "Unknown error. Please try again.",
    BAD_REQUEST: "Invalid request",
} as const;
