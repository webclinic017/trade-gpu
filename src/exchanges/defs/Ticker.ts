import BigNumber from 'bignumber.js';

export interface Ticker {
  timestamp: BigNumber;
  low: BigNumber;
  high: BigNumber;
  last: BigNumber;
  volume: BigNumber;
  volume30d: BigNumber;
  bid: number;
  ask: number;
  priceChange: BigNumber;
  priceChangePercentage: BigNumber;
  pair: string;
}
