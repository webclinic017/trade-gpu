import { BigNumber } from 'bignumber.js';
import Model, { ModelPairs } from './model';
import {
  Database, Table, Column, Options,
} from '..';
import { Devise } from '../../exchanges/defs';

const table = new Table('tick');
const row: [string, string, Options][] = [
  ['id', 'INTEGER', { increment: true }],
  ['exchange', 'TEXT', { nullable: false, index: true }],
  ['timestamp', 'INTEGER', { nullable: false, index: true }],
  ['left', 'TEXT', { nullable: false, index: true }],
  ['right', 'TEXT', { nullable: false, index: true }],
  ['low', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['high', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['last', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['volume', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['volume30d', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['bid', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['ask', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['priceChange', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
  ['priceChangePercentage', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
];
row.forEach((r) => table.add(new Column(r[0], r[1], r[2])));

export const TickTable = table;

const b = (value: any) => new BigNumber(value);
export default class Tick extends Model {
  static list(database: Database, exchange: string): Promise<Tick[]> {
    return database.list(TickTable, (r) => Tick.fromRow(r), [
      {
        column: 'exchange',
        operator: '=',
        value: exchange,
      },
    ]);
  }

  static last(
    database: Database,
    exchange: string,
    left: Devise,
    right: Devise,
  ): Promise<Tick> {
    return database.lastWhere(
      TickTable,
      ['left', 'right', 'exchange'],
      [left, right, exchange],
      (r) => Tick.fromRow(r),
    );
  }

  static fromRow(h: any): Tick {
    return new Tick(
      h.left,
      h.right,
      h.exchange,
      b(h.timestamp),
      b(h.low),
      b(h.high),
      b(h.last),
      b(h.volume),
      b(h.volume30d),
      b(h.bid),
      b(h.ask),
      b(h.priceChange),
      b(h.priceChangePercentage),
    );
  }

  static from(h: any, exchange: string): Tick {
    const split = (h.pair || 'XXX:XXX').split(':');
    return new Tick(
      split[0],
      split[1],
      exchange,
      b(h.timestamp),
      b(h.low),
      b(h.high),
      b(h.last),
      b(h.volume),
      b(h.volume30d),
      b(h.bid),
      b(h.ask),
      b(h.priceChange),
      b(h.priceChangePercentage),
    );
  }

  constructor(
    public left: string,
    public right: string,
    public exchange: string,
    public timestamp: BigNumber,
    public low: BigNumber,
    public high: BigNumber,
    public last: BigNumber,
    public volume: BigNumber,
    public volume30d: BigNumber,
    public bid: BigNumber,
    public ask: BigNumber,
    public priceChange: BigNumber,
    public priceChangePercentage: BigNumber,
  ) {
    super('tick');
  }

  pairs(): ModelPairs {
    return [
      ['left', this.left, true],
      ['right', this.right, true],
      ['exchange', this.exchange, true],
      ['timestamp', this.timestamp.toString()],
      ['low', this.low.toString()],
      ['high', this.high.toString()],
      ['last', this.last.toString()],
      ['volume', this.volume.toString()],
      ['volume30d', this.volume30d.toString()],
      ['bid', this.bid.toString()],
      ['ask', this.ask.toString()],
      ['priceChange', this.priceChange.toString()],
      ['priceChangePercentage', this.priceChangePercentage.toString()],
    ];
  }
}
