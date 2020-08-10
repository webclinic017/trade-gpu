import { Devise } from './../../cex/instance';
import { BigNumber } from 'bignumber.js';
import Model from "./model"
import { Database, Table, Column, Options } from '..';


const table = new Table("tick");
const row: ([string, string, Options])[] = [
  ["id", "INTEGER", {increment: true}],
  ["timestamp", "INTEGER", {nullable:false, index: true}],
  ["left", "TEXT", {nullable:false, index: true}],
  ["right", "TEXT", {nullable:false, index: true}],
  ["low", "INTEGER", {nullable:false}],
  ["high", "INTEGER", {nullable:false}],
  ["last", "INTEGER", {nullable:false}],
  ["volume", "INTEGER", {nullable:false}],
  ["volume30d", "INTEGER", {nullable:false}],
  ["bid", "INTEGER", {nullable:false}],
  ["ask", "INTEGER", {nullable:false}],
  ["priceChange", "INTEGER", {nullable:false}],
  ["priceChangePercentage", "INTEGER", {nullable:false}],
];
row.forEach(row =>table.add(new Column(row[0], row[1], row[2])));

export const TickTable = table;

const b = (value: any) => new BigNumber(value);
export default class Tick extends Model {

  static list(database: Database): Promise<Tick[]> {
    return database.list(TickTable, (r) => Tick.fromRow(r));
  }

  static last(database: Database, left: Devise, right: Devise): Promise<Tick> {
    return database.lastWhere(TickTable, ["left", "right"], [left, right], (r) => Tick.fromRow(r));
  }

  static fromRow(h: any): Tick {
    return new Tick(h.left, h.right, b(h.timestamp),
      b(h.low), b(h.high), b(h.last), b(h.volume), b(h.volume30d),
      b(h.bid), b(h.ask), b(h.priceChange), b(h.priceChangePercentage));
  }

  static from(h: any): Tick {
    const split = (h.pair||"XXX:XXX").split(":");
    return new Tick(split[0], split[1], b(h.timestamp),
      b(h.low), b(h.high), b(h.last), b(h.volume), b(h.volume30d),
      b(h.bid), b(h.ask), b(h.priceChange), b(h.priceChangePercentage));
  }

  constructor(public left: string,
    public right: string,
    public timestamp: BigNumber,
    public low:BigNumber,
    public high: BigNumber,
    public last: BigNumber,
    public volume: BigNumber,
    public volume30d: BigNumber,
    public bid: BigNumber,
    public ask: BigNumber,
    public priceChange: BigNumber,
    public priceChangePercentage: BigNumber) {
    super("tick");
  }

  pairs(): ([string, any, boolean?])[] {
    return [
      ["left", this.left, true],
      ["right", this.right, true],
      ["timestamp", this.timestamp.toString()],
      ["low", this.low.toString()],
      ["high", this.high.toString()],
      ["last", this.last.toString()],
      ["volume", this.volume.toString()],
      ["volume30d", this.volume30d.toString()],
      ["bid", this.bid.toString()],
      ["ask", this.ask.toString()],
      ["priceChange", this.priceChange.toString()],
      ["priceChangePercentage", this.priceChangePercentage.toString()]
    ];
  }
}