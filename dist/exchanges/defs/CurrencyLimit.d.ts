import BigNumber from 'bignumber.js';
export interface CurrencyLimit {
    from: string;
    to: string;
    pricePrecision: number;
    minimumSizeTo: BigNumber;
    minimumSizeFrom: BigNumber;
    minPrice: BigNumber;
    maxPrice: BigNumber;
}
