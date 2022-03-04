"use strict";
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
const cex_1 = __importDefault(require("../exchanges/cex"));
class Runner {
    constructor(exchange) {
        this.exchange = exchange;
        const configs = TradeConfigArray_1.getTradeConfigArray();
        const devises = new Map();
        const decimals = DeviceConfigArray_1.getDeviseConfigArray();
        decimals.forEach((d) => devises.set(d.name, d));
        this.tickHolder = new TickHolder_1.default(cex_1.default);
        this.ordersHolders = new orders_1.default(cex_1.default, this.tickHolder.database());
        this.tradeEngine = new TradeEngine_1.default(devises, configs, cex_1.default, this.tickHolder, this.ordersHolders);
        [
            ...defs_1.DeviseNames.map((crypto) => ['EUR', crypto]),
            ...defs_1.DeviseNames.map((crypto) => ['USD', crypto]),
        ].forEach((tuple) => this.tickHolder.register(tuple[0], tuple[1]));
    }
    start() {
        this.tickHolder
            .start()
            .then(() => {
            console.log(`${this.exchange.name()} trade engine starting...`);
            this.tradeEngine.start();
        })
            .catch((err) => console.log(err));
    }
}
exports.Runner = Runner;
//# sourceMappingURL=index.js.map