export class ClixError extends Error {
  static readonly NOT_INITIALIZED =
    'Clix SDK is not initialized. Call Clix.initialize() first.';
  static readonly INVALID_CONFIGURATION = 'Invalid SDK configuration.';
  static readonly INVALID_URL = 'The provided URL is invalid.';
  static readonly INVALID_RESPONSE =
    'The response was invalid or permission was denied.';
  static readonly ENCODING_ERROR = 'Failed to encode request body.';
  static readonly UNKNOWN_ERROR = 'An unknown error occurred.';

  constructor(message: string) {
    super(message);
    this.name = 'ClixError';
  }

  static notInitialized(): ClixError {
    return new ClixError(this.NOT_INITIALIZED);
  }

  static invalidConfiguration(): ClixError {
    return new ClixError(this.INVALID_CONFIGURATION);
  }

  static invalidURL(): ClixError {
    return new ClixError(this.INVALID_URL);
  }

  static invalidResponse(): ClixError {
    return new ClixError(this.INVALID_RESPONSE);
  }

  static encodingError(): ClixError {
    return new ClixError(this.ENCODING_ERROR);
  }

  static unknownError(): ClixError {
    return new ClixError(this.UNKNOWN_ERROR);
  }

  static networkError(underlyingError: string): ClixError {
    return new ClixError(`Network request failed: ${underlyingError}`);
  }

  static decodingError(underlyingError: string): ClixError {
    return new ClixError(`Failed to decode response body: ${underlyingError}`);
  }

  static unknownErrorWithReason(reason: string): ClixError {
    return new ClixError(`An unknown error occurred: ${reason}`);
  }
}
