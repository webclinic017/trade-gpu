import { BigNumber } from 'bignumber.js';
import Model from './model';
import {
  Database, Table, Column, Options,
} from '..';
import { WhereTuple } from '../Database';

const table = new Table('wallet_aggregated');
const row: [string, string, Options][] = [
  ['id', 'INTEGER', { increment: true }],
  ['start', 'INTEGER', { nullable: false }],
  ['end', 'INTEGER', { nullable: false }],
  ['exchange', 'TEXT', { nullable: false }],
  ['devise', 'TEXT', { nullable: false }],
  ['expected_amount_max', 'TEXT', { nullable: false }],
  ['current_amount_max', 'TEXT', { nullable: false }],
  ['expected_amount_min', 'TEXT', { nullable: false }],
  ['current_amount_min', 'TEXT', { nullable: false }],
  ['expected_amount_avg', 'TEXT', { nullable: false }],
  ['current_amount_avg', 'TEXT', { nullable: false }],
];
row.forEach((row) => table.add(new Column(row[0], row[1], row[2])));

export const WalletAggregatedTable = table;

const b = (value: any) => new BigNumber(value);

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
  static last(
    database: Database,
    exchange: string,
  ): Promise<WalletAggregated | null> {
    return database.last(
      WalletAggregatedTable,
      (r) => WalletAggregated.fromRow(r),
      'start',
    );
  }

  static list(
    database: Database,
    exchange: string,
    from?: Date,
    to?: Date,
  ): Promise<WalletAggregated[]> {
    return WalletAggregated.listCallback<WalletAggregated>(
      database,
      exchange,
      (r) => WalletAggregated.fromRow(r),
      from,
      to,
    );
  }

  private static listCallback<T>(
    database: Database,
    exchange: string,
    transform: (row: any) => T,
    from?: Date,
    to?: Date,
  ): Promise<T[]> {
    const args: WhereTuple[] = [
      {
        column: 'exchange',
        operator: '=',
        value: exchange,
      },
    ];
    if (from) {
      args.push({
        column: 'start',
        operator: '>=',
        value: from.getTime(),
      });
    }
    if (to) {
      args.push({
        column: 'end',
        operator: '<=',
        value: to.getTime(),
      });
    }
    return database.list(WalletAggregatedTable, transform, args);
  }

  static fromRow(h: any): WalletAggregated {
    return new WalletAggregated(
      h.exchange,
      b(h.start),
      b(h.end),
      h.devise,
      b(h.expected_amount_max),
      b(h.current_amount_max),
      b(h.expected_amount_min),
      b(h.current_amount_min),
      b(h.expected_amount_avg),
      b(h.current_amount_avg),
      h.id,
    );
  }

  constructor(
    public exchange: string,
    public start: BigNumber,
    public end: BigNumber,
    public devise: string,
    public expectedAmountMax: BigNumber,
    public currentAmountMax: BigNumber,
    public expectedAmountMin: BigNumber,
    public currentAmountMin: BigNumber,
    public expectedAmountAvg: BigNumber,
    public currentAmountAvg: BigNumber,
    public id?: number,
  ) {
    super('wallet_aggregated', id);
  }

  public save(database: Database): Promise<WalletAggregated> {
    return super.save(database) as any;
  }

  json(): any {
    const object: any = {};
    Object.keys(this).forEach((k) => {
      if (this[k]?.constructor?.name === 'BigNumber') {
        object[k] = (this[k] as BigNumber).toNumber();
      } else {
        object[k] = this[k];
      }
    });
    return object;
  }

  pairs(): [string, any, boolean?][] {
    return [
      ['start', this.start.toString()],
      ['end', this.end.toString()],
      ['exchange', this.exchange, true],
      ['devise', this.devise, true],
      ['expected_amount_max', this.expectedAmountMax.toString()],
      ['current_amount_max', this.currentAmountMax.toString()],
      ['expected_amount_min', this.expectedAmountMin.toString()],
      ['current_amount_min', this.currentAmountMin.toString()],
      ['expected_amount_avg', this.expectedAmountAvg.toString()],
      ['current_amount_avg', this.currentAmountAvg.toString()],
    ];
  }

  str() {
    const {
      devise, start, end, expectedAmountMax, currentAmountMax,
    } = this;
    return (
      `${start.toNumber()} :: ${devise} `
      + `${expectedAmountMax.toFixed(3)}/${currentAmountMax.toFixed(3)}`
    );
  }
}
