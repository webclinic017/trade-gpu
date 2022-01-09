import BigNumber from 'bignumber.js';

export interface CurrencyLimit {
  from: string; // symbol2
  to: string; // symbol1
  pricePrecision: number;
  minimumSizeTo: BigNumber;
  minimumSizeFrom: BigNumber;
  minPrice: BigNumber;
  maxPrice: BigNumber;
}
