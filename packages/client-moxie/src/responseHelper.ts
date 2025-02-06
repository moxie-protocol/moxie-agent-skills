import { ApiResponse } from "./types/types";

export class ResponseHelper {
    static success<T>(data: T, traceId?: string, message: string = "Success", ): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            metadata: {
                traceId: traceId
            }
        };
    }

    static error<T>(
        code: string,
        details: string,
        path?: string,
        traceId?: string,
        additionalData?: { [key: string]: any},
        message: string = "Error",
    ): ApiResponse<T> {
        return {
            success: false,
            message,
            data: null,
            error: {
                code,
                details,
                path,
            },
            metadata: {
                traceId: traceId,
                ...additionalData
            }
        };
    }
}