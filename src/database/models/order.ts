import { BigNumber } from 'bignumber.js';
import Model from "./model"
import { Database, Table, Column, Options } from '..';

const table = new Table("orders");
const row: ([string, string, Options])[] = [
  ["id", "INTEGER", {increment: true}],
  ["txid", "INTEGER", {nullable:false, index: true}],
  ["timeout", "INTEGER", {nullable:false, index: true}],
  ["timestamp", "INTEGER", {nullable:false, index: true}],
  ["type", "TEXT", {nullable:false}],
  ["price", "TEXT", {nullable:false}],
  ["amount", "INTEGER", {nullable:false}],
  ["pending", "INTEGER", {nullable:false}],
  ["left", "INTEGER", {nullable:false, index: true}],
  ["completed", "INTEGER", {nullable:false}],
  ["right", "INTEGER", {nullable:false, index: true}],
];
row.forEach(row =>table.add(new Column(row[0], row[1], row[2])));

export const OrderTable = table;

const b = (value: any) => new BigNumber(value);
export default class Order extends Model {

  static list(database: Database): Promise<Order[]> {
    return database.list(OrderTable, (r) => Order.fromRow(r));
  }

  static last(database: Database): Promise<Order|null> {
    return database.last(OrderTable, (r) => Order.fromRow(r));
  }

  static fromRow(h: any): Order {
    return new Order(h.left, h.right, b(h.txid), b(h.timestamp), !!h.timeout,
    h.type, b(h.price), b(h.amount), b(h.pending), !!h.completed, h.id);
  }

  static from(h: any): Order {
    return new Order(h.symbol1, h.symbol2, b(h.id), b(h.time), !!h.timeout,
      h.type, b(h.price), b(h.amount), b(h.pending), false);
  }

  constructor(public left: string,
    public right: string,
    public txid: BigNumber,
    public timestamp: BigNumber,
    public timeout: boolean,
    public type:string,
    public price: BigNumber,
    public amount: BigNumber,
    public pending: BigNumber,
    public completed: boolean,
    public id?: number) {
    super("orders", id);
  }

  isIn(orders: Order[]) {
    return orders.filter(o => o.timestamp && o.timestamp.isEqualTo(this.timestamp)).length > 0;
  }

  public save(database: Database): Promise<Order> {
    return super.save(database) as any;
  }

  pairs(): ([string, any, boolean?])[] {
    return [
      ["txid", this.txid, true],
      ["left", this.left, true],
      ["right", this.right, true],
      ["timestamp", this.timestamp.toString()],
      ["timeout", !!this.timeout],
      ["type", this.type, true],
      ["price", this.price.toString()],
      ["amount", this.amount.toString()],
      ["pending", this.pending.toString()],
      ["completed", !!this.completed]
    ];
  }

  str() {
    const { left, right, price, amount, timestamp, type } = this;
    return `${timestamp.toNumber()} :: ${type} ${left}/${right} `
    + `${amount}/${amount.multipliedBy(price).toFixed(2)} `
    + `(${price.toFixed(2)})`
  }
}