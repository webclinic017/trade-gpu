"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTable = void 0;
const bignumber_js_1 = require("bignumber.js");
const model_1 = __importDefault(require("./model"));
const __1 = require("..");
const table = new __1.Table('orders');
const row = [
    ['id', 'INTEGER', { increment: true }],
    ['exchange', 'TEXT', { nullable: false }],
    ['txid', 'INTEGER', { nullable: false, index: true }],
    ['timeout', 'INTEGER', { nullable: false, index: true }],
    ['timestamp', 'INTEGER', { nullable: false, index: true }],
    ['type', 'TEXT', { nullable: false }],
    ['price', 'TEXT', { nullable: false }],
    ['amount', 'TEXT', { nullable: false }],
    ['pending', 'TEXT', { nullable: false }],
    ['left', 'INTEGER', { nullable: false, index: true }],
    ['completed', 'INTEGER', { nullable: false }],
    ['right', 'INTEGER', { nullable: false, index: true }],
];
row.forEach((row) => table.add(new __1.Column(row[0], row[1], row[2])));
exports.OrderTable = table;
const b = (value) => new bignumber_js_1.BigNumber(value);
class Order extends model_1.default {
    static list(database, exchange) {
        return database.list(exports.OrderTable, (r) => Order.fromRow(r), [
            {
                column: 'exchange',
                operator: '=',
                value: exchange,
            },
        ]);
    }
    static last(database, exchange) {
        return database.lastWhere(exports.OrderTable, ['exchange'], [exchange], (r) => Order.fromRow(r));
    }
    static fromRow(h) {
        return new Order(h.exchange, h.left, h.right, b(h.txid), b(h.timestamp), !!h.timeout, h.type, b(h.price), b(h.amount), b(h.pending), !!h.completed, h.id);
    }
    static from(h, exchange) {
        return new Order(exchange, h.symbol1, h.symbol2, b(h.id), b(h.time), !!h.timeout, h.type, b(h.price), b(h.amount), b(h.pending), false);
    }
    constructor(exchange, left, right, txid, timestamp, timeout, type, price, amount, pending, completed, id) {
        super('orders', id);
        this.exchange = exchange;
        this.left = left;
        this.right = right;
        this.txid = txid;
        this.timestamp = timestamp;
        this.timeout = timeout;
        this.type = type;
        this.price = price;
        this.amount = amount;
        this.pending = pending;
        this.completed = completed;
        this.id = id;
    }
    isIn(orders) {
        return (orders.filter((o) => o.timestamp && o.timestamp.isEqualTo(this.timestamp))
            .length > 0);
    }
    save(database) {
        return super.save(database);
    }
    json() {
        const object = {};
        Object.keys(this).forEach((k) => {
            var _a, _b;
            if (((_b = (_a = this[k]) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === 'BigNumber') {
                object[k] = this[k].toNumber();
            }
            else {
                object[k] = this[k];
            }
        });
        return object;
    }
    pairs() {
        return [
            ['txid', this.txid.toString(), true],
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
        const { left, right, price, amount, timestamp, type, } = this;
        return (`${timestamp.toNumber()} :: ${type} ${left}/${right} `
            + `${amount}/${amount.multipliedBy(price).toFixed(2)} `
            + `(${price.toFixed(2)})`);
    }
}
exports.default = Order;
//# sourceMappingURL=order.js.map