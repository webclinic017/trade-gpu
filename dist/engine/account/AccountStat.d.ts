import { TradeConfig } from './../InternalTradeEngine';
import { AbstractExchange } from '../../exchanges/AbstractExchange';
import { Devise } from '../../exchanges/defs';
import Orders from '../orders';
import BigNumber from 'bignumber.js';
import Order from '../../database/models/order';
interface StatTuple {
    from: Devise;
    to: Devise;
    order?: Order;
    solde: BigNumber;
    weight: number;
}
export interface DeviseTotal {
    devise: Devise;
    total: BigNumber;
    totalWeight: number;
}
export interface Stat {
    values: DeviseTotal[];
    tuples: StatTuple[];
}
export default class AccountStat {
    private exchange;
    private configs;
    private ordersHolders;
    constructor(exchange: AbstractExchange, configs: TradeConfig[], ordersHolders: Orders);
    stats(): Promise<Stat>;
}
export {};
