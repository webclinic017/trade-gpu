import { BigNumber } from 'bignumber.js';
import Model from './model';
import {
  Database, Table, Column, Options,
} from '..';
import { WhereTuple } from '../Database';

const table = new Table('wallet');
const row: [string, string, Options][] = [
  ['id', 'INTEGER', { increment: true }],
  ['exchange', 'TEXT', { nullable: false }],
  ['timestamp', 'INTEGER', { nullable: false, index: true }],
  ['devise', 'TEXT', { nullable: false }],
  ['expected_amount', 'TEXT', { nullable: false }],
  ['current_amount', 'TEXT', { nullable: false }],
];
row.forEach((row) => table.add(new Column(row[0], row[1], row[2])));

export const WalletTable = table;

const b = (value: any) => new BigNumber(value);

export interface WalletRaw {
  id: number;
  exchange: string;
  timestamp: number;
  devise: string;
  expected_amount: string;
  current_amount: string;
}

export default class Wallet extends Model {
  static list(
    database: Database,
    exchange: string,
    from?: Date,
    to?: Date,
  ): Promise<Wallet[]> {
    return Wallet.listCallback<Wallet>(
      database,
      exchange,
      (r) => Wallet.fromRow(r),
      from,
      to,
    );
  }

  static listRaw(
    database: Database,
    exchange: string,
    from?: Date,
    to?: Date,
  ): Promise<WalletRaw[]> {
    return Wallet.listCallback<WalletRaw>(database, exchange, (r) => r, from, to);
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
        column: 'timestamp',
        operator: '>',
        value: from.getTime(),
      });
    }
    if (to) {
      args.push({
        column: 'timestamp',
        operator: '<',
        value: to.getTime(),
      });
    }
    return database.list(WalletTable, transform, args);
  }

  static last(database: Database, exchange: string): Promise<Wallet> {
    return database.lastWhere(WalletTable, ['exchange'], [exchange], (r) => Wallet.fromRow(r));
  }

  static fromRow(h: any): Wallet {
    return new Wallet(
      h.exchange,
      b(h.timestamp),
      h.devise,
      b(h.expected_amount),
      b(h.current_amount),
      h.id,
    );
  }

  constructor(
    public exchange: string,
    public timestamp: BigNumber,
    public devise: string,
    public expectedAmount: BigNumber,
    public currentAmount: BigNumber,
    public id?: number,
  ) {
    super('wallet', id);
  }

  isIn(orders: Wallet[]) {
    return (
      orders.filter((o) => o.timestamp && o.timestamp.isEqualTo(this.timestamp))
        .length > 0
    );
  }

  public save(database: Database): Promise<Wallet> {
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
      ['exchange', this.exchange, true],
      ['timestamp', this.timestamp.toString()],
      ['devise', this.devise, true],
      ['expected_amount', this.expectedAmount.toString()],
      ['current_amount', this.currentAmount.toString()],
    ];
  }

  str() {
    const {
      devise, expectedAmount, currentAmount, timestamp,
    } = this;
    return (
      `${timestamp.toNumber()} :: ${devise} `
      + `${expectedAmount.toFixed(3)}/${currentAmount.toFixed(3)}`
    );
  }
}
