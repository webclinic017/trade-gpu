import BigNumber from 'bignumber.js';

export interface AccountBalanceValue {
  available: BigNumber;
  orders: BigNumber;
}
