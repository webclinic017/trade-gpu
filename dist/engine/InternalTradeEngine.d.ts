import { BigNumber } from 'bignumber.js';
import { Database } from '../database';
import TickHolder from './TickHolder';
import Orders from './orders';
import Order from '../database/models/order';
import { CurrencyLimit, Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
export interface DeviseConfig {
    name: Devise;
    decimals: number;
    minimum: number;
    decimals_price?: number;
}
export interface TradeConfig {
    from: Devise;
    to: Devise;
    buy_coef: number;
    sell_coef: number;
    maximum_price_change_percent: number;
    minimum_balance_used: number;
    balance_weight_used: number;
}
export default class InternalTradeEngine {
    protected configs: TradeConfig[];
    protected exchange: AbstractExchange;
    protected tickHolder: TickHolder;
    protected ordersHolders: Orders;
    protected currencyLimits?: CurrencyLimit[];
    constructor(configs: TradeConfig[], exchange: AbstractExchange, tickHolder: TickHolder, ordersHolders: Orders);
    protected log(text: string, arg?: any): void;
    protected error(text: string, arg?: any): void;
    load_configuration(): Promise<CurrencyLimit[]>;
    protected database(): Database;
    protected currency(from?: Devise, to?: Devise): CurrencyLimit | null;
    protected expectedValue(config: TradeConfig): Promise<[BigNumber, BigNumber]>;
    protected last(orders: Order[], type: 'sell' | 'buy'): Order | null;
}
