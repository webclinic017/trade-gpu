import { AbstractExchange } from '../exchanges/AbstractExchange';
export declare class Runner {
    private exchange;
    private tickHolder;
    private ordersHolders;
    private tradeEngine;
    constructor(exchange: AbstractExchange);
    start(): void;
}
