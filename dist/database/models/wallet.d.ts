import { BigNumber } from 'bignumber.js';
import Model from './model';
import { Database, Table } from '..';
export declare const WalletTable: Table;
export default class Wallet extends Model {
    exchange: string;
    timestamp: BigNumber;
    devise: string;
    expectedAmount: BigNumber;
    currentAmount: BigNumber;
    id?: number | undefined;
    static list(database: Database, exchange: string, from?: Date, to?: Date): Promise<Wallet[]>;
    static listRaw(database: Database, exchange: string, from?: Date, to?: Date): Promise<Wallet[]>;
    private static listCallback;
    static last(database: Database, exchange: string): Promise<Wallet>;
    static fromRow(h: any): Wallet;
    constructor(exchange: string, timestamp: BigNumber, devise: string, expectedAmount: BigNumber, currentAmount: BigNumber, id?: number | undefined);
    isIn(orders: Wallet[]): boolean;
    save(database: Database): Promise<Wallet>;
    json(): any;
    pairs(): [string, any, boolean?][];
    str(): string;
}
