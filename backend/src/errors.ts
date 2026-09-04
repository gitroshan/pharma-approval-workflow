/** Typed application errors that the error middleware maps to HTTP responses. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const BadRequest = (m: string, details?: unknown) =>
  new AppError(400, m, 'BAD_REQUEST', details);
export const Unauthorized = (m = 'Authentication required') =>
  new AppError(401, m, 'UNAUTHORIZED');
export const Forbidden = (m = 'You are not permitted to perform this action') =>
  new AppError(403, m, 'FORBIDDEN');
export const NotFound = (m = 'Resource not found') => new AppError(404, m, 'NOT_FOUND');
export const Conflict = (m: string) => new AppError(409, m, 'CONFLICT');
