import { BigNumber } from 'bignumber.js';
import Model from './model';
import { Database, Table } from '..';
export declare const OrderTable: Table;
export default class Order extends Model {
    exchange: string;
    left: string;
    right: string;
    txid: BigNumber;
    timestamp: BigNumber;
    timeout: boolean;
    type: 'buy' | 'sell';
    price: BigNumber;
    amount: BigNumber;
    pending: BigNumber;
    completed: boolean;
    id?: number | undefined;
    static list(database: Database, exchange: string): Promise<Order[]>;
    static last(database: Database, exchange: string): Promise<Order | null>;
    static fromRow(h: any): Order;
    static from(h: any, exchange: string): Order;
    constructor(exchange: string, left: string, right: string, txid: BigNumber, timestamp: BigNumber, timeout: boolean, type: 'buy' | 'sell', price: BigNumber, amount: BigNumber, pending: BigNumber, completed: boolean, id?: number | undefined);
    isIn(orders: Order[]): boolean;
    save(database: Database): Promise<Order>;
    json(): any;
    pairs(): [string, any, boolean?][];
    str(): string;
}
