/**
 * Creates a custom application error with an HTTP status code.
 *
 * @param message Human-readable error message safe for API responses.
 * @param statusCode HTTP status code associated with the error.
 * @returns A new application error instance.
 * @throws Never throws directly.
 */
class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

/**
 * Creates a 404 not found error.
 *
 * @param message Human-readable error message safe for API responses.
 * @returns A not found error instance.
 * @throws Never throws directly.
 */
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.') {
    super(message, 400);
  }
}

/**
 * Creates a 422 business rule error.
 *
 * @param message Human-readable error message safe for API responses.
 * @returns A business rule error instance.
 * @throws Never throws directly.
 */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/**
 * Creates a 401 unauthorized error.
 *
 * @param message Human-readable error message safe for API responses.
 * @returns An unauthorized error instance.
 * @throws Never throws directly.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Creates a 403 forbidden error.
 *
 * @param message Human-readable error message safe for API responses.
 * @returns A forbidden error instance.
 * @throws Never throws directly.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Creates a 429 rate limit error.
 *
 * @param message Human-readable error message safe for API responses.
 * @returns A rate limit error instance.
 * @throws Never throws directly.
 */
export class RateLimitExceededError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}
