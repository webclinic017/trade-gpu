import { BigNumber } from 'bignumber.js';
import Model, { ModelPairs } from './model';
import { Database, Table } from '..';
import { Devise } from '../../exchanges/defs';
export declare const TickTable: Table;
export default class Tick extends Model {
    left: string;
    right: string;
    exchange: string;
    timestamp: BigNumber;
    low: BigNumber;
    high: BigNumber;
    last: BigNumber;
    volume: BigNumber;
    volume30d: BigNumber;
    bid: BigNumber;
    ask: BigNumber;
    priceChange: BigNumber;
    priceChangePercentage: BigNumber;
    static list(database: Database, exchange: string): Promise<Tick[]>;
    static last(database: Database, exchange: string, left: Devise, right: Devise): Promise<Tick>;
    static fromRow(h: any): Tick;
    static from(h: any, exchange: string): Tick;
    constructor(left: string, right: string, exchange: string, timestamp: BigNumber, low: BigNumber, high: BigNumber, last: BigNumber, volume: BigNumber, volume30d: BigNumber, bid: BigNumber, ask: BigNumber, priceChange: BigNumber, priceChangePercentage: BigNumber);
    pairs(): ModelPairs;
}
