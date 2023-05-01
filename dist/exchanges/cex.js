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
exports.Cex = void 0;
// @ts-ignore
const cexio_api_node_1 = __importDefault(require("cexio-api-node"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const moment_1 = __importDefault(require("moment"));
const cex_1 = __importDefault(require("../config/cex"));
const AbstractExchange_1 = require("./AbstractExchange");
const defs_1 = require("./defs");
function wait(time) {
    if (time <= 0)
        return Promise.resolve();
    return new Promise((resolve) => {
        console.log(`waiting for ${time}ms`);
        setTimeout(() => resolve(), time);
    });
}
function toCurrencyLimit(object) {
    if (!object)
        throw `invalid object ${JSON.stringify(object)}`;
    if (!object)
        throw `invalid object ${JSON.stringify(object)}`;
    const { symbol1, symbol2, pricePrecision, minLotSize, minLotSizeS2, minPrice, maxPrice, } = object;
    return {
        from: symbol2,
        to: symbol1,
        pricePrecision: parseInt(pricePrecision),
        minimumSizeTo: new bignumber_js_1.default(minLotSize),
        minimumSizeFrom: new bignumber_js_1.default(minLotSizeS2),
        minPrice: new bignumber_js_1.default(minPrice),
        maxPrice: new bignumber_js_1.default(maxPrice),
    };
}
const RETRIES = 3;
class Cex extends AbstractExchange_1.AbstractExchange {
    constructor() {
        super();
        this.cexAuth = new cexio_api_node_1.default(cex_1.default.clientId, cex_1.default.api, cex_1.default.secret).promiseRest;
    }
    name() {
        return 'cex';
    }
    setAvailableOrders(objIn, objOut) {
        const keysInObjIn = Object.keys(objIn);
        defs_1.DeviseNames.forEach((name) => {
            if (!keysInObjIn.includes(name)) {
                console.error(`Invalid name, not found in the keys: ${name}`, keysInObjIn);
            }
            const value = objIn[name];
            if (value && value.available && value.orders) {
                objOut[name] = {
                    available: new bignumber_js_1.default(value.available),
                    orders: new bignumber_js_1.default(value.orders),
                };
            }
        });
    }
    toShortOrder(raw) {
        const obj = {};
        ['id', 'type', 'symbol1', 'symbol2'].forEach((k) => (obj[k] = raw[k]));
        ['time'].forEach((k) => {
            if (!!raw[k] && typeof raw[k] === 'string' && raw[k].indexOf('T') > 0) {
                obj[k] = (0, moment_1.default)(raw[k]).unix() * 1000; // CEX is sending millis but unix() is in seconds
            }
            else {
                obj[k] = parseInt(raw[k] || 0);
            }
        });
        ['price', 'amount', 'pending'].forEach((k) => (obj[k] = new bignumber_js_1.default(raw[k])));
        return obj;
    }
    wrap(promise) {
        return new Promise((resolve, reject) => {
            promise
                .then((d) => setTimeout(() => resolve(d), 1500))
                .catch((err) => setTimeout(() => reject(err), 1500));
        });
    }
    currency_limits() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wrap(this.cexAuth.currency_limits());
            if (!result || !result.pairs || result.pairs.length === 0)
                throw 'invalid configuration found for currency limits in CEX';
            return result.pairs.map((p) => toCurrencyLimit(p));
        });
    }
    history_orders(left, right) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wrap(this.cexAuth.archived_orders(`${left}/${right}`));
            if (result && result.length > 0) {
                return result
                    .map((o) => this.toShortOrder(o))
                    .sort((left, right) => left.time - right.time);
            }
            return [];
        });
    }
    open_orders() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wrap(this.cexAuth.open_orders(null));
            if (result && result.length > 0)
                return result.map((o) => this.toShortOrder(o));
            return [];
        });
    }
    place_order(left, right, type, amount, price) {
        return __awaiter(this, void 0, void 0, function* () {
            // will try at most 3 times in case of connection reset
            return this.place_order_check(left, right, type, amount, price, RETRIES);
        });
    }
    place_order_check(left, right, type, amount, price, numberRetry) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield this.wrap(this.cexAuth.place_order(`${left}/${right}`, type, amount, price, null));
                return this.toShortOrder(order);
            }
            catch (e) {
                const error = `${e}`;
                if (!numberRetry
                    || numberRetry < 0
                    || !(error.indexOf('ESOCKETTIMEDOUT') >= 0))
                    throw e;
                const retries = numberRetry - 1;
                yield wait((RETRIES - retries) * 1000);
                return this.place_order_check(left, right, type, amount, price, retries);
            }
        });
    }
    cancel_order(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return !!(yield this.wrap(this.cexAuth.cancel_order(id)));
        });
    }
    account_balance() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wrap(this.cexAuth.account_balance());
            const object = {
                timestamp: parseInt(result.timestamp),
                balances: {},
            };
            // take every Devises
            defs_1.DeviseNames.forEach((value) => {
                object.balances[value] = {
                    available: new bignumber_js_1.default(0),
                    orders: new bignumber_js_1.default(0),
                };
            });
            this.setAvailableOrders(result, object.balances);
            return object;
        });
    }
    ticker(left, right) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wrap(this.cexAuth.ticker(`${left}/${right}`));
            if (typeof result === 'string'
                || `${result}`.indexOf('Invalid Symbols') >= 0) {
                throw new Error(`${result}`);
            }
            const obj = { pair: result.pair };
            [
                'timestamp',
                'low',
                'high',
                'last',
                'volume',
                'volume30d',
                'bid',
                'ask',
                'priceChange',
                'priceChangePercentage',
            ].forEach((k) => {
                obj[k] = new bignumber_js_1.default(result[k]);
            });
            return obj;
        });
    }
}
exports.Cex = Cex;
exports.default = new Cex();
//# sourceMappingURL=cex.js.map