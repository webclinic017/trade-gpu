import { BigNumber } from 'bignumber.js';
import Model from './model';
import { Database, Table } from '..';
export declare const WalletAggregatedTable: Table;
export interface WalletAggregatedRaw {
    id: number;
    start: string;
    end: number;
    exchange: string;
    devise: string;
    expected_amount_max: string;
    current_amount_max: string;
    expected_amount_min: string;
    current_amount_min: string;
    expected_amount_avg: string;
    current_amount_avg: string;
}
export default class WalletAggregated extends Model {
    exchange: string;
    start: BigNumber;
    end: BigNumber;
    devise: string;
    expectedAmountMax: BigNumber;
    currentAmountMax: BigNumber;
    expectedAmountMin: BigNumber;
    currentAmountMin: BigNumber;
    expectedAmountAvg: BigNumber;
    currentAmountAvg: BigNumber;
    id?: number | undefined;
    static last(database: Database, exchange: string): Promise<WalletAggregated | null>;
    static list(database: Database, exchange: string, from?: Date, to?: Date): Promise<WalletAggregated[]>;
    private static listCallback;
    static fromRow(h: any): WalletAggregated;
    constructor(exchange: string, start: BigNumber, end: BigNumber, devise: string, expectedAmountMax: BigNumber, currentAmountMax: BigNumber, expectedAmountMin: BigNumber, currentAmountMin: BigNumber, expectedAmountAvg: BigNumber, currentAmountAvg: BigNumber, id?: number | undefined);
    save(database: Database): Promise<WalletAggregated>;
    json(): any;
    pairs(): [string, any, boolean?][];
    str(): string;
}
