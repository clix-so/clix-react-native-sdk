export declare enum ClixErrorCode {
    NOT_INITIALIZED = "NOT_INITIALIZED",
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
    INVALID_URL = "INVALID_URL",
    INVALID_RESPONSE = "INVALID_RESPONSE",
    ENCODING_ERROR = "ENCODING_ERROR",
    DECODING_ERROR = "DECODING_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export declare class ClixError extends Error {
    readonly code: ClixErrorCode;
    cause?: unknown;
    constructor(code: ClixErrorCode, message?: string, options?: {
        cause?: unknown;
    });
    static notInitialized(options?: {
        cause?: unknown;
    }): ClixError;
    static invalidConfiguration(options?: {
        cause?: unknown;
    }): ClixError;
    static invalidURL(options?: {
        cause?: unknown;
    }): ClixError;
    static invalidResponse(options?: {
        cause?: unknown;
    }): ClixError;
    static encodingError(options?: {
        cause?: unknown;
    }): ClixError;
    static decodingError(options?: {
        cause?: unknown;
    }): ClixError;
    static networkError(underlyingError: unknown): ClixError;
    static unknownError(options?: {
        cause?: unknown;
        reason?: string;
    }): ClixError;
}
//# sourceMappingURL=ClixError.d.ts.map