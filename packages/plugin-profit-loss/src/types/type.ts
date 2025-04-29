export interface PnlData {
    wallet_address: string;
    moxie_user_id: string;
    token_address: string;
    total_sell_amount: number;
    total_sell_value_usd: number;
    total_buy_amount: number;
    total_buy_value_usd: number;
    avg_sell_price_usd: number;
    avg_buy_price_usd: number;
    profit_loss: number;
    first_sale_time: Date;
    last_sale_time: Date;
    sale_transactions: number;
}