import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add a traceId to every incoming request
 */
export const traceIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.traceId = uuidv4();  // Attach a UUID as traceId
    next();  // Continue to the next middleware or route handler
};