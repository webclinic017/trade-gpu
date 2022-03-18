"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAggregatedTable = void 0;
const bignumber_js_1 = require("bignumber.js");
const model_1 = __importDefault(require("./model"));
const __1 = require("..");
const table = new __1.Table('wallet_aggregated');
const row = [
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
row.forEach((row) => table.add(new __1.Column(row[0], row[1], row[2])));
exports.WalletAggregatedTable = table;
const b = (value) => new bignumber_js_1.BigNumber(value);
class WalletAggregated extends model_1.default {
    constructor(exchange, start, end, devise, expectedAmountMax, currentAmountMax, expectedAmountMin, currentAmountMin, expectedAmountAvg, currentAmountAvg, id) {
        super('wallet_aggregated', id);
        this.exchange = exchange;
        this.start = start;
        this.end = end;
        this.devise = devise;
        this.expectedAmountMax = expectedAmountMax;
        this.currentAmountMax = currentAmountMax;
        this.expectedAmountMin = expectedAmountMin;
        this.currentAmountMin = currentAmountMin;
        this.expectedAmountAvg = expectedAmountAvg;
        this.currentAmountAvg = currentAmountAvg;
        this.id = id;
    }
    static last(database, exchange) {
        return database.last(exports.WalletAggregatedTable, (r) => WalletAggregated.fromRow(r), 'start');
    }
    static list(database, exchange, from, to) {
        return WalletAggregated.listCallback(database, exchange, (r) => WalletAggregated.fromRow(r), from, to);
    }
    static listCallback(database, exchange, transform, from, to) {
        const args = [
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
        return database.list(exports.WalletAggregatedTable, transform, args);
    }
    static fromRow(h) {
        return new WalletAggregated(h.exchange, b(h.start), b(h.end), h.devise, b(h.expected_amount_max), b(h.current_amount_max), b(h.expected_amount_min), b(h.current_amount_min), b(h.expected_amount_avg), b(h.current_amount_avg), h.id);
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
        const { devise, start, end, expectedAmountMax, currentAmountMax, } = this;
        return (`${start.toNumber()} :: ${devise} `
            + `${expectedAmountMax.toFixed(3)}/${currentAmountMax.toFixed(3)}`);
    }
}
exports.default = WalletAggregated;
//# sourceMappingURL=wallet_aggregation.js.map