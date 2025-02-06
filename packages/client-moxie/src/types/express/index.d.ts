import 'express';

declare module 'express-serve-static-core' {
    interface Request {
        traceId?: string;  // Add traceId to the Request interface
        privyId?: string;
        isAuthorised?: boolean;
    }
}