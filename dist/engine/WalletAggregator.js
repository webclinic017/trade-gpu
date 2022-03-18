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
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const moment_1 = __importDefault(require("moment"));
const wallet_1 = __importDefault(require("../database/models/wallet"));
const wallet_aggregation_1 = __importDefault(require("../database/models/wallet_aggregation"));
function pushInto(walletDevise, wallet) {
    const { devise } = wallet;
    if (!walletDevise[devise]) {
        walletDevise[devise] = [];
    }
    walletDevise[devise].push(wallet);
}
class WalletAggregatorClass {
    constructor(database, exchange) {
        this.database = database;
        this.exchange = exchange;
        this.started = false;
        this.aggregating = false;
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        setInterval(() => {
            this.startAggregation();
        }, 10 * 60000);
        this.startAggregation();
    }
    startAggregation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.aggregating)
                return;
            this.aggregating = true;
            try {
                const last = yield wallet_aggregation_1.default.last(this.database, this.exchange);
                const barrier = moment_1.default()
                    .startOf('hour')
                    .add(-30, 'minutes')
                    .endOf('hour');
                const lastDate = last ? moment_1.default(last.start.toNumber()) : undefined;
                let lastWalletDate;
                if (!lastDate) {
                    const wallet = yield wallet_1.default.first(this.database, this.exchange);
                    if (!wallet) {
                        throw 'no wallet saved, cancelling creation';
                    }
                    lastWalletDate = moment_1.default(wallet.timestamp.toNumber()).startOf('hour');
                }
                if (!lastWalletDate && !lastDate)
                    throw 'invalid case';
                let start = lastWalletDate
                    ? lastWalletDate.startOf('hour')
                    : lastDate === null || lastDate === void 0 ? void 0 : lastDate.clone().add(30, 'minutes').startOf('hour');
                if (!start)
                    throw 'invalid start';
                let end = start.clone().endOf('hour');
                while (start && end.isBefore(barrier)) {
                    const holder = {};
                    console.log(`${start}/${end} is before ${barrier}`);
                    const wallets = yield wallet_1.default.list(this.database, this.exchange, start.toDate(), end.toDate());
                    wallets.forEach((w) => pushInto(holder, w));
                    const startOf = start;
                    const endOf = end;
                    const toSave = [];
                    Object.keys(holder).forEach((key) => {
                        if (!startOf)
                            return;
                        const wallets = holder[key];
                        console.log(`found ${wallets.length} wallets item for this interval`);
                        const currentArray = wallets.map((w) => w.currentAmount.toNumber());
                        const expectedArray = wallets.map((w) => w.expectedAmount.toNumber());
                        const currentMax = new bignumber_js_1.default(Math.max(...currentArray));
                        const expectedMax = new bignumber_js_1.default(Math.max(...expectedArray));
                        const currentMin = new bignumber_js_1.default(Math.min(...currentArray));
                        const expectedMin = new bignumber_js_1.default(Math.min(...expectedArray));
                        const currentSum = new bignumber_js_1.default(currentArray.reduce((l, r) => l + r, 0) / currentArray.length);
                        const expectedSum = new bignumber_js_1.default(expectedArray.reduce((l, r) => l + r, 0) / expectedArray.length);
                        const walletAggregated = new wallet_aggregation_1.default(this.exchange, new bignumber_js_1.default(startOf.unix() * 1000), new bignumber_js_1.default(endOf.unix() * 1000), key, expectedMax, currentMax, expectedMin, currentMin, expectedSum, currentSum);
                        toSave.push(walletAggregated);
                    });
                    for (let i = 0; i < toSave.length; i++) {
                        yield toSave[i].save(this.database);
                        console.log(`${toSave[i].id} saved`);
                    }
                    start = end.clone().add(30, 'minutes').startOf('hour');
                    end = start.clone().endOf('hour');
                }
            }
            catch (e) {
                console.error(e);
            }
            this.aggregating = false;
        });
    }
}
exports.default = WalletAggregatorClass;
//# sourceMappingURL=WalletAggregator.js.map