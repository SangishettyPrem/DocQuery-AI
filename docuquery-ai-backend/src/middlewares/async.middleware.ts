import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps asynchronous Express route handlers to automatically catch rejections
 * and forward them to the global error handling middleware.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
