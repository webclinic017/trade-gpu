"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTable = void 0;
const bignumber_js_1 = require("bignumber.js");
const model_1 = __importDefault(require("./model"));
const __1 = require("..");
const table = new __1.Table('wallet');
const row = [
    ['id', 'INTEGER', { increment: true }],
    ['exchange', 'TEXT', { nullable: false }],
    ['timestamp', 'INTEGER', { nullable: false, index: true }],
    ['devise', 'TEXT', { nullable: false }],
    ['expected_amount', 'TEXT', { nullable: false }],
    ['current_amount', 'TEXT', { nullable: false }],
];
row.forEach((row) => table.add(new __1.Column(row[0], row[1], row[2])));
exports.WalletTable = table;
const b = (value) => new bignumber_js_1.BigNumber(value);
class Wallet extends model_1.default {
    constructor(exchange, timestamp, devise, expectedAmount, currentAmount, id) {
        super('wallet', id);
        this.exchange = exchange;
        this.timestamp = timestamp;
        this.devise = devise;
        this.expectedAmount = expectedAmount;
        this.currentAmount = currentAmount;
        this.id = id;
    }
    static list(database, exchange, from, to) {
        const args = [
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
        return database.list(exports.WalletTable, (r) => Wallet.fromRow(r), args);
    }
    static last(database, exchange) {
        return database.lastWhere(exports.WalletTable, ['exchange'], [exchange], (r) => Wallet.fromRow(r));
    }
    static fromRow(h) {
        return new Wallet(h.exchange, b(h.timestamp), h.devise, b(h.expected_amount), b(h.current_amount), h.id);
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
            ['exchange', this.exchange, true],
            ['timestamp', this.timestamp.toString()],
            ['devise', this.devise, true],
            ['expected_amount', this.expectedAmount.toString()],
            ['current_amount', this.currentAmount.toString()],
        ];
    }
    str() {
        const { devise, expectedAmount, currentAmount, timestamp, } = this;
        return (`${timestamp.toNumber()} :: ${devise} `
            + `${expectedAmount.toFixed(3)}/${currentAmount.toFixed(3)}`);
    }
}
exports.default = Wallet;
//# sourceMappingURL=wallet.js.map