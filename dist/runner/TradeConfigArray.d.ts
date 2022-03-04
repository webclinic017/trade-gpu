export declare function getTradeConfigArray(): {
    from: "EUR" | "USD" | "BTC" | "BCH" | "ETH" | "XRP" | "LTC" | "DASH" | "DOGE" | "ADA" | "SHIB" | "MANA" | "TRX" | "OMG";
    to: "EUR" | "USD" | "BTC" | "BCH" | "ETH" | "XRP" | "LTC" | "DASH" | "DOGE" | "ADA" | "SHIB" | "MANA" | "TRX" | "OMG";
    buy_coef: number;
    sell_coef: number;
    maximum_price_change_percent: number;
    maximum_balance_used: number;
}[];
