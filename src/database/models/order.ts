import { BigNumber } from 'bignumber.js';
import Model from './model';
import {
  Database, Table, Column, Options,
} from '..';

const table = new Table('orders');
const row: [string, string, Options][] = [
  ['id', 'INTEGER', { increment: true }],
  ['exchange', 'TEXT', { nullable: false }],
  ['txid', 'INTEGER', { nullable: false, index: true }],
  ['timeout', 'INTEGER', { nullable: false, index: true }],
  ['timestamp', 'INTEGER', { nullable: false, index: true }],
  ['type', 'TEXT', { nullable: false }],
  ['price', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['amount', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['pending', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['left', 'INTEGER', { nullable: false, index: true }],
  ['completed', 'INTEGER', { nullable: false }],
  ['right', 'INTEGER', { nullable: false, index: true }],
];
row.forEach((row) => table.add(new Column(row[0], row[1], row[2])));

export const OrderTable = table;

const b = (value: any) => new BigNumber(value);
export default class Order extends Model {
  static list(database: Database, exchange: string): Promise<Order[]> {
    return database.list(OrderTable, (r) => Order.fromRow(r), {
      columns: ['exchange'],
      values: [exchange],
    });
  }

  static last(database: Database, exchange: string): Promise<Order | null> {
    return database.lastWhere(OrderTable, ['exchange'], [exchange], (r) => Order.fromRow(r));
  }

  static fromRow(h: any): Order {
    return new Order(
      h.exchange,
      h.left,
      h.right,
      b(h.txid),
      b(h.timestamp),
      !!h.timeout,
      h.type,
      b(h.price),
      b(h.amount),
      b(h.pending),
      !!h.completed,
      h.id,
    );
  }

  static from(h: any, exchange: string): Order {
    return new Order(
      exchange,
      h.symbol1,
      h.symbol2,
      b(h.id),
      b(h.time),
      !!h.timeout,
      h.type,
      b(h.price),
      b(h.amount),
      b(h.pending),
      false,
    );
  }

  constructor(
    public exchange: string,
    public left: string,
    public right: string,
    public txid: BigNumber,
    public timestamp: BigNumber,
    public timeout: boolean,
    public type: string,
    public price: BigNumber,
    public amount: BigNumber,
    public pending: BigNumber,
    public completed: boolean,
    public id?: number,
  ) {
    super('orders', id);
  }

  isIn(orders: Order[]) {
    return (
      orders.filter((o) => o.timestamp && o.timestamp.isEqualTo(this.timestamp))
        .length > 0
    );
  }

  public save(database: Database): Promise<Order> {
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
      ['txid', this.txid, true],
      ['exchange', this.exchange, true],
      ['left', this.left, true],
      ['right', this.right, true],
      ['timestamp', this.timestamp.toString()],
      ['timeout', !!this.timeout],
      ['type', this.type, true],
      ['price', this.price.toString()],
      ['amount', this.amount.toString()],
      ['pending', this.pending.toString()],
      ['completed', !!this.completed],
    ];
  }

  str() {
    const {
      left, right, price, amount, timestamp, type,
    } = this;
    return (
      `${timestamp.toNumber()} :: ${type} ${left}/${right} `
      + `${amount}/${amount.multipliedBy(price).toFixed(2)} `
      + `(${price.toFixed(2)})`
    );
  }
}
