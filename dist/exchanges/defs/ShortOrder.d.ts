import BigNumber from 'bignumber.js';
import { Devise, OrderType } from '.';
export interface ShortOrder {
    id: string;
    time: number;
    type: OrderType;
    price: BigNumber;
    amount: BigNumber;
    pending: BigNumber | null;
    symbol1: Devise;
    symbol2: Devise;
}
