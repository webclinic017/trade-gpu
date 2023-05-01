"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickTable = void 0;
const bignumber_js_1 = require("bignumber.js");
const model_1 = __importDefault(require("./model"));
const __1 = require("..");
const table = new __1.Table('tick');
const row = [
    ['id', 'INTEGER', { increment: true }],
    ['exchange', 'TEXT', { nullable: false, index: true }],
    ['timestamp', 'INTEGER', { nullable: false, index: true }],
    ['left', 'TEXT', { nullable: false, index: true }],
    ['right', 'TEXT', { nullable: false, index: true }],
    ['low', 'TEXT', { nullable: false }],
    ['high', 'TEXT', { nullable: false }],
    ['last', 'TEXT', { nullable: false }],
    ['volume', 'TEXT', { nullable: false }],
    ['volume30d', 'TEXT', { nullable: false }],
    ['bid', 'TEXT', { nullable: false }],
    ['ask', 'TEXT', { nullable: false }],
    ['priceChange', 'TEXT', { nullable: false }],
    ['priceChangePercentage', 'TEXT', { nullable: false }], // will be transformed to/from BigNumer
];
row.forEach((r) => table.add(new __1.Column(r[0], r[1], r[2])));
exports.TickTable = table;
const b = (value) => new bignumber_js_1.BigNumber(value);
class Tick extends model_1.default {
    static list(database, exchange) {
        return database.list(exports.TickTable, (r) => Tick.fromRow(r), [
            {
                column: 'exchange',
                operator: '=',
                value: exchange,
            },
        ]);
    }
    static last(database, exchange, left, right) {
        return database.lastWhere(exports.TickTable, ['left', 'right', 'exchange'], [left, right, exchange], (r) => Tick.fromRow(r));
    }
    static fromRow(h) {
        return new Tick(h.left, h.right, h.exchange, b(h.timestamp), b(h.low), b(h.high), b(h.last), b(h.volume), b(h.volume30d), b(h.bid), b(h.ask), b(h.priceChange), b(h.priceChangePercentage));
    }
    static from(h, exchange) {
        const split = (h.pair || 'XXX:XXX').split(':');
        return new Tick(split[0], split[1], exchange, b(h.timestamp), b(h.low), b(h.high), b(h.last), b(h.volume), b(h.volume30d), b(h.bid), b(h.ask), b(h.priceChange), b(h.priceChangePercentage));
    }
    constructor(left, right, exchange, timestamp, low, high, last, volume, volume30d, bid, ask, priceChange, priceChangePercentage) {
        super('tick');
        this.left = left;
        this.right = right;
        this.exchange = exchange;
        this.timestamp = timestamp;
        this.low = low;
        this.high = high;
        this.last = last;
        this.volume = volume;
        this.volume30d = volume30d;
        this.bid = bid;
        this.ask = ask;
        this.priceChange = priceChange;
        this.priceChangePercentage = priceChangePercentage;
    }
    pairs() {
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
exports.default = Tick;
//# sourceMappingURL=ticks.js.map