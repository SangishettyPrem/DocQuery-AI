import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralized Application Error Handling Middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error(`❌ [${req.method} ${req.url}] Error:`, err.message || err);

  // Multer Errors (file upload)
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      error: 'File Upload Error',
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      issues: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // AI Provider Quota / Rate Limiting
  if (
    err.message?.includes('rate limit') ||
    err.message?.includes('quota') ||
    err.message?.includes('RESOURCE_EXHAUSTED')
  ) {
    res.status(429).json({
      success: false,
      error: 'Rate Limit Exceeded',
      message:
        'The AI service is temporarily experiencing high demand or quota limits. Please retry in a few moments.',
    });
    return;
  }

  // Invalid Credentials
  if (err.message?.includes('API key') || err.message?.includes('API_KEY_INVALID')) {
    res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: err.message,
    });
    return;
  }

  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Failed',
    message: err.message || 'An unexpected error occurred.',
    timestamp: new Date().toISOString(),
  });
};
