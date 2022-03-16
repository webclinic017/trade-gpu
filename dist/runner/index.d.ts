import { Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import Order from '../database/models/order';
export declare class Runner {
    private exchange;
    private pairs;
    private tickHolder;
    private ordersHolders;
    private tradeEngine;
    constructor(exchange: AbstractExchange);
    orders(): Promise<{
        from: Devise;
        to: Devise;
        orders: Order[];
    }[]>;
    wallets(from?: Date, to?: Date): Promise<import("../database/models/wallet").default[]>;
    start(): Promise<void>;
}
