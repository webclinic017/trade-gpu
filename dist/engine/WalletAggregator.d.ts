import { Database } from '../database';
export default class WalletAggregatorClass {
    private database;
    private exchange;
    private started;
    private aggregating;
    constructor(database: Database, exchange: string);
    start(): void;
    private startAggregation;
}
