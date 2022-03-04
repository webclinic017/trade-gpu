"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = require("bignumber.js");
const ticks_1 = __importDefault(require("../database/models/ticks"));
bignumber_js_1.BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: bignumber_js_1.BigNumber.ROUND_FLOOR });
class InternalTradeEngine {
    constructor(devises, configs, exchange, tickHolder, ordersHolders) {
        this.devises = devises;
        this.configs = configs;
        this.exchange = exchange;
        this.tickHolder = tickHolder;
        this.ordersHolders = ordersHolders;
    }
    log(text, arg) {
        if (arguments.length > 1)
            console.log(`${this.exchange.name()} ${text}`, arg);
        else
            console.log(`${this.exchange.name()} ${text}`);
    }
    error(text, arg) {
        if (arguments.length > 1)
            console.error(`${this.exchange.name()} ${text}`, arg);
        else
            console.error(`${this.exchange.name()} ${text}`);
    }
    load_configuration() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currencyLimits)
                return this.currencyLimits;
            this.currencyLimits = (yield this.exchange.currency_limits()) || [];
            return this.currencyLimits;
        });
    }
    database() {
        return this.tickHolder.database();
    }
    currency(from, to) {
        if (!this.currencyLimits)
            throw 'invalid configuration';
        return (this.currencyLimits.find((cl) => cl.from === from && cl.to === to) || null);
    }
    decimals(devise) {
        if (!devise)
            return 2;
        const object = this.devises.get(devise);
        if (!object)
            return 2;
        let { decimals } = object;
        if (decimals === null || undefined === decimals)
            decimals = 0;
        if (decimals < 0)
            decimals = 0;
        return decimals;
    }
    expectedValue(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const results = yield Promise.all([
                    ticks_1.default.last(this.database(), this.exchange.name(), config.to, config.from),
                    this.ordersHolders.list(config.from, config.to),
                ]);
                const configuration = this.currency(config.from, config.to);
                if (!configuration)
                    throw `couldn't load configuration for ${config.from} Ò-> ${config.to}`;
                const tick = results[0];
                const orders = results[1] || [];
                if (!tick)
                    throw 'no tick';
                const price = tick.last;
                if (!price)
                    throw 'no last price';
                const current = orders.filter((o) => !o.completed && o.type === 'sell');
                const expectedValue = current
                    .map((order) => order.price.multipliedBy(order.amount))
                    .reduce((p, c) => p.plus(c), new bignumber_js_1.BigNumber(0));
                const currentValue = current
                    .map((order) => tick.last.multipliedBy(order.amount))
                    .reduce((p, c) => p.plus(c), new bignumber_js_1.BigNumber(0));
                return [expectedValue, currentValue];
            }
            catch (e) {
                return [new bignumber_js_1.BigNumber(0), new bignumber_js_1.BigNumber(0)];
            }
        });
    }
    last(orders, type) {
        return orders
            .filter((o) => o.type === type)
            .reduce((left, right) => {
            if (!left)
                return right;
            if (!right)
                return left;
            return left.timestamp.isGreaterThan(right.timestamp) ? left : right;
        }, null);
    }
}
exports.default = InternalTradeEngine;
//# sourceMappingURL=InternalTradeEngine.js.map