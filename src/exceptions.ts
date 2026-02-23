/** Base exception for all KAKEN API errors. */
export class KakenApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'KakenApiError';
  }
}

/** Exception raised when there is an error with the HTTP request. */
export class KakenApiRequestError extends KakenApiError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'KakenApiRequestError';
  }
}

/** Exception raised when there is an error with the API response. */
export class KakenApiResponseError extends KakenApiError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'KakenApiResponseError';
  }
}

/** Exception raised when authentication fails (defaults to 401). */
export class KakenApiAuthError extends KakenApiError {
  constructor(message: string, statusCode = 401) {
    super(message, statusCode);
    this.name = 'KakenApiAuthError';
  }
}

/** Exception raised when the API rate limit is exceeded (defaults to 429). */
export class KakenApiRateLimitError extends KakenApiError {
  constructor(message: string, statusCode = 429) {
    super(message, statusCode);
    this.name = 'KakenApiRateLimitError';
  }
}

/** Exception raised when a resource is not found (defaults to 404). */
export class KakenApiNotFoundError extends KakenApiError {
  constructor(message: string, statusCode = 404) {
    super(message, statusCode);
    this.name = 'KakenApiNotFoundError';
  }
}
