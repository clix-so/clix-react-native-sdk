export enum ClixErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  INVALID_URL = 'INVALID_URL',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  ENCODING_ERROR = 'ENCODING_ERROR',
  DECODING_ERROR = 'DECODING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const ClixErrorMessages: Record<ClixErrorCode, string> = {
  [ClixErrorCode.NOT_INITIALIZED]:
    'Clix SDK is not initialized. Call Clix.initialize() first.',
  [ClixErrorCode.INVALID_CONFIGURATION]: 'Invalid SDK configuration.',
  [ClixErrorCode.INVALID_URL]: 'The provided URL is invalid.',
  [ClixErrorCode.INVALID_RESPONSE]:
    'The response was invalid or permission was denied.',
  [ClixErrorCode.ENCODING_ERROR]: 'Failed to encode request body.',
  [ClixErrorCode.DECODING_ERROR]: 'Failed to decode response body.',
  [ClixErrorCode.NETWORK_ERROR]: 'Network request failed.',
  [ClixErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.',
};

export class ClixError extends Error {
  readonly code: ClixErrorCode;
  override cause?: unknown;

  constructor(
    code: ClixErrorCode,
    message?: string,
    options?: { cause?: unknown }
  ) {
    super(message ?? ClixErrorMessages[code]);
    this.name = 'ClixError';
    this.code = code;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  static notInitialized(options?: { cause?: unknown }) {
    return new ClixError(ClixErrorCode.NOT_INITIALIZED, undefined, options);
  }
  static invalidConfiguration(options?: { cause?: unknown }) {
    return new ClixError(
      ClixErrorCode.INVALID_CONFIGURATION,
      undefined,
      options
    );
  }
  static invalidURL(options?: { cause?: unknown }) {
    return new ClixError(ClixErrorCode.INVALID_URL, undefined, options);
  }
  static invalidResponse(options?: { cause?: unknown }) {
    return new ClixError(ClixErrorCode.INVALID_RESPONSE, undefined, options);
  }
  static encodingError(options?: { cause?: unknown }) {
    return new ClixError(ClixErrorCode.ENCODING_ERROR, undefined, options);
  }
  static decodingError(options?: { cause?: unknown }) {
    return new ClixError(ClixErrorCode.DECODING_ERROR, undefined, options);
  }
  static networkError(underlyingError: unknown) {
    return new ClixError(ClixErrorCode.NETWORK_ERROR, undefined, {
      cause: underlyingError,
    });
  }
  static unknownError(options?: { cause?: unknown; reason?: string }) {
    const msg =
      options?.reason != null
        ? `${ClixErrorMessages[ClixErrorCode.UNKNOWN_ERROR]}: ${options.reason}`
        : undefined;
    return new ClixError(ClixErrorCode.UNKNOWN_ERROR, msg, {
      cause: options?.cause,
    });
  }
}
