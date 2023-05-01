export declare function getTradeConfigArray(): {
    from: "EUR" | "USD" | "BTC" | "BCH" | "ETH" | "XRP" | "LTC" | "DASH" | "DOGE" | "ADA" | "SHIB" | "MANA" | "TRX" | "OMG" | "XLM" | "ONT" | "ONG" | "YFI" | "MATIC";
    to: "EUR" | "USD" | "BTC" | "BCH" | "ETH" | "XRP" | "LTC" | "DASH" | "DOGE" | "ADA" | "SHIB" | "MANA" | "TRX" | "OMG" | "XLM" | "ONT" | "ONG" | "YFI" | "MATIC";
    buy_coef: number;
    sell_coef: number;
    maximum_price_change_percent: number;
    minimum_balance_used: number;
    balance_weight_used: number;
}[];
