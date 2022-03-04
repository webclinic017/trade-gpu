"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviseConfigArray = void 0;
const decimals = [
    {
        name: 'EUR',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'XRP',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'LTC',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'TRX',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'ETH',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'DASH',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'BTC',
        decimals: 5,
        decimals_price: 0,
        minimum: 0.00001,
    },
    {
        name: 'DOGE',
        decimals: 1,
        minimum: 50,
    },
    {
        name: 'ADA',
        decimals: 2,
        minimum: 0.01,
    },
    {
        name: 'SHIB',
        decimals: 0,
        decimals_price: 10,
        minimum: 1,
    },
    {
        name: 'MANA',
        decimals: 0,
        decimals_price: 10,
        minimum: 1,
    },
    {
        name: 'OMG',
        decimals: 0,
        decimals_price: 10,
        minimum: 1,
    },
];
function getDeviseConfigArray() {
    return decimals.map((d) => (Object.assign({}, d)));
}
exports.getDeviseConfigArray = getDeviseConfigArray;
//# sourceMappingURL=DeviceConfigArray.js.map