import { Request, Response, NextFunction } from 'express';
import { privyClient } from '../lib/privy'
import { elizaLogger } from '@elizaos/core';
import { ResponseHelper } from '../responseHelper.ts';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path == '/health' || req.path == '/favicon.ico') {
        return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '') || "";
    try {
        const claim = await privyClient.verifyAuthToken(token);
        const privyId = claim.userId;
        req.isAuthorised = Boolean(privyId);
        req.privyId = privyId;
    } catch (error) {
        req.isAuthorised = false;
        elizaLogger.error(error);
        res.status(401).json(
            ResponseHelper.error<null>(
                "AUTHENTICATION_FAILED",
                `privy authentication is failed, ${error}`,
                req.path
            )
        );
        return
    }
    next();
};