"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../database/models/order");
const ticks_1 = __importStar(require("../database/models/ticks"));
const database_1 = require("../database");
const wallet_1 = require("../database/models/wallet");
class TickHolder {
    constructor(exchange) {
        this.exchange = exchange;
        this.pairs = [];
        this.array = [];
        this.callback = () => {
            Promise.all(this.pairs.map((pair) => this.tick(pair)))
                .then(() => {
                this.post();
                if (this.resolve)
                    this.resolve(true);
            })
                .catch((err) => {
                this.post();
            });
        };
        this.db = new database_1.Database('trading');
        this.db.add(ticks_1.TickTable);
        this.db.add(order_1.OrderTable);
        this.db.add(wallet_1.WalletTable);
    }
    log(text, arg) {
        if (arguments.length > 1)
            console.log(`${this.exchange.name()} ${text}`, arg);
        else
            console.log(`${this.exchange.name()} ${text}`);
    }
    register(from, to) {
        if (!this.pairs.find((t) => t.from === from && t.to === to)) {
            this.log('registering tickers for ', { from, to });
            this.pairs.push({ from, to });
        }
    }
    database() {
        return this.db;
    }
    start() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.callback();
        });
    }
    next() {
        if (this.array.length > 0) {
            const tickCall = this.array[0];
            tickCall.callback().then(() => {
                this.array.splice(0, 1);
                setTimeout(() => this.next(), 1);
            });
        }
    }
    tick(pair) {
        return new Promise((resolve, reject) => {
            const callback = () => new Promise((resolveForNext) => {
                this.exchange
                    .ticker(pair.to, pair.from)
                    .then((ticker) => {
                    const object = ticks_1.default.from(ticker, this.exchange.name());
                    object.log(false);
                    return object.save(this.database());
                })
                    .then(() => {
                    resolveForNext();
                    resolve(true);
                })
                    .catch((err) => {
                    resolveForNext();
                    resolve(false);
                });
            });
            const tickerCall = { pair, callback };
            this.array.push(tickerCall);
            if (this.array.length === 1) {
                this.next();
            }
        });
    }
    post() {
        setTimeout(() => this.callback(), 60000);
    }
}
exports.default = TickHolder;
//# sourceMappingURL=TickHolder.js.map