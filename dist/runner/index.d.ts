import { Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import Order from '../database/models/order';
export declare class Runner {
    private exchangeObject;
    private pairs;
    private tickHolder;
    private ordersHolders;
    private tradeEngine;
    constructor(exchangeObject: AbstractExchange);
    orders(): Promise<{
        from: Devise;
        to: Devise;
        orders: Order[];
    }[]>;
    wallets(from?: Date, to?: Date): Promise<import("../database/models/wallet").default[]>;
    walletsRaw(from?: Date, to?: Date): Promise<import("../database/models/wallet").WalletRaw[]>;
    walletAggregated(from?: Date, to?: Date): Promise<import("../database/models/wallet_aggregation").default[]>;
    database(): import("../database").Database;
    start(): Promise<void>;
    exchange(): string;
}
