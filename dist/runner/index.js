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
exports.Runner = void 0;
const TradeEngine_1 = __importDefault(require("../engine/TradeEngine"));
const TickHolder_1 = __importDefault(require("../engine/TickHolder"));
const orders_1 = __importDefault(require("../engine/orders"));
const defs_1 = require("../exchanges/defs");
const DeviceConfigArray_1 = require("./DeviceConfigArray");
const TradeConfigArray_1 = require("./TradeConfigArray");
class Runner {
    constructor(exchangeObject) {
        this.exchangeObject = exchangeObject;
        this.pairs = [];
        const configs = TradeConfigArray_1.getTradeConfigArray();
        const devises = new Map();
        const decimals = DeviceConfigArray_1.getDeviseConfigArray();
        decimals.forEach((d) => devises.set(d.name, d));
        this.tickHolder = new TickHolder_1.default(exchangeObject);
        this.ordersHolders = new orders_1.default(exchangeObject, this.tickHolder.database());
        this.tradeEngine = new TradeEngine_1.default(devises, configs, exchangeObject, this.tickHolder, this.ordersHolders);
        this.pairs = [
            ...defs_1.DeviseNames.map((crypto) => ['EUR', crypto]),
            ...defs_1.DeviseNames.map((crypto) => ['USD', crypto]),
        ].filter(([left, right]) => left !== right);
        this.pairs.forEach(([left, right]) => this.tickHolder.register(left, right));
    }
    orders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return Promise.all(this.pairs.map(([left, right]) => this.ordersHolders.list(left, right)));
            }
            catch (err) {
                return [];
            }
        });
    }
    wallets(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.tradeEngine.wallets(from, to);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.tickHolder.start();
                console.log(`${this.exchange()} trade engine starting...`);
                this.tradeEngine.start();
            }
            catch (err) {
                console.error('starting error', err);
            }
        });
    }
    exchange() {
        return this.exchangeObject.name();
    }
}
exports.Runner = Runner;
//# sourceMappingURL=index.js.map