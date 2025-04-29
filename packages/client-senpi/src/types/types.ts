export interface MoxieScoreLedger {
    id: string;
    userId: string;
    groupId: string;
    type: string;
    value: number; // Decimal is represented as number in TypeScript
    metadata?: Record<string, any>;
    referenceId?: string;
    createdAt: Date;
    deletedAt?: Date;
    scoredUserIdentityId?: string;
    dataSource?: string;
    updatedAt?: Date;
    updatedBy?: string;
    createdBy?: string;
    deletedBy?: string;
  };

  export interface MoxieScore {
    userId: string;
    value: number; // Decimal is represented as number in TypeScript
    createdAt: Date;
    updatedAt: Date;
  };


export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
    error?: {
      code: string;
      details: string;
      path?: string;
    };
    metadata?: {
      traceId: string;
    };
  }

export interface UserAgentInfo {
    userId: string
    agentExists?: boolean
    agentId?: string
    roomId?: string
}

export interface ValidationError {
    field: string;
    message: string;
}

export type UserAgentInteraction = {
    userId: string;
    roomId: string;
    agentId: string;
    createdAt: number;
    text: string;
}