export interface TokenAddresses {
    tokenAddresses: string[];
    topNHolders: number;
}

export interface TokenHolderDuneResponse {
    senpi_user_id: string;
    token_address: string;
    total_balance: number;
    total_balance_in_usd?: number;
    profile_link?: string;
}
