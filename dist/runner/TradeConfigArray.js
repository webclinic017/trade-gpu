"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTradeConfigArray = void 0;
const configs = [
    {
        from: 'EUR',
        to: 'ETH',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'EUR',
        to: 'XRP',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 8,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'EUR',
        to: 'LTC',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'EUR',
        to: 'BCH',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 5,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'EUR',
        to: 'BTC',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'DOGE',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'EUR',
        to: 'DASH',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'ADA',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 5,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'SHIB',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'MANA',
        buy_coef: 0.985,
        sell_coef: 1.028,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'OMG',
        buy_coef: 0.985,
        sell_coef: 1.028,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'TRX',
        buy_coef: 0.985,
        sell_coef: 1.028,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'XLM',
        buy_coef: 0.985,
        sell_coef: 1.028,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'ONT',
        buy_coef: 0.985,
        sell_coef: 1.022,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'ONG',
        buy_coef: 0.985,
        sell_coef: 1.022,
        maximum_price_change_percent: 20,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'YFI',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
    {
        from: 'USD',
        to: 'MATIC',
        buy_coef: 0.995,
        sell_coef: 1.028,
        maximum_price_change_percent: 10,
        minimum_balance_used: 100,
        balance_weight_used: 1
    },
];
function getTradeConfigArray() {
    return configs.map((c) => (Object.assign({}, c)));
}
exports.getTradeConfigArray = getTradeConfigArray;
//# sourceMappingURL=TradeConfigArray.js.map