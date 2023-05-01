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
const wallet_1 = __importDefault(require("../database/models/wallet"));
const InternalTradeEngine_1 = __importDefault(require("./InternalTradeEngine"));
const wallet_aggregation_1 = __importDefault(require("../database/models/wallet_aggregation"));
const WalletAggregator_1 = __importDefault(require("./WalletAggregator"));
const account_1 = require("./account");
const type_manager_1 = require("./type_manager");
bignumber_js_1.BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: bignumber_js_1.BigNumber.ROUND_FLOOR });
class TradeEngine extends InternalTradeEngine_1.default {
    constructor(devises, configs, exchange, tickHolder, ordersHolders) {
        super(configs, exchange, tickHolder, ordersHolders);
        this.fullfillOrder = (config, deviseTotal = { devise: config.from, total: new bignumber_js_1.BigNumber(0), totalWeight: 0 }) => __awaiter(this, void 0, void 0, function* () {
            const { from, to } = config;
            this.log(`managing for ${from}->${to}, max can be ${deviseTotal.total.toNumber()}`);
            try {
                const results = yield Promise.all([
                    ticks_1.default.last(this.database(), this.exchange.name(), config.to, config.from),
                    this.ordersHolders.fetch(config.from, config.to),
                ]);
                const configuration = this.currency(config.from, config.to);
                if (!configuration)
                    throw `couldn't load configuration for ${config.from} Ò-> ${config.to}`;
                const tick = results[0];
                const orders = results[1] || [];
                if (!tick)
                    return false;
                const price = tick.last;
                if (!price)
                    return false;
                const current = orders.filter((o) => !o.completed);
                // already have an order to fullfill
                if (current.length > 0) {
                    const order = current[0];
                    const timediff = Math.floor(tick.timestamp
                        .multipliedBy(1000)
                        .minus(order.timestamp)
                        .dividedBy(1000)
                        .toNumber());
                    if (timediff > 12 * 3600 && order.type === 'buy') {
                        this.log(`created width a diff of ${timediff}`);
                        this.log('timeout !');
                        const result = yield this.exchange.cancel_order(order.txid.toFixed());
                        this.log(`tx ${order.txid} canceled`, result);
                        order.timeout = true;
                        return !!(yield order.save(this.database()));
                    }
                    this.log(current.map((o) => o.str()).join('\n'));
                    return true;
                }
                // get the account balance
                const { balances } = yield this.exchange.account_balance();
                Object.keys(balances).map((key) => ({
                    available: balances[key].available.toNumber(),
                    orders: balances[key].orders.toNumber(),
                }));
                const from = balances[config.from];
                const to = balances[config.to];
                // this.log("from", from);
                // this.log("to", to);
                // this.log("account_balance " + balances[config.from].available.toFixed(), from);
                // this.log("account_balance " + balances[config.to].available.toFixed(), to);
                const toBalance = to.available;
                let fromBalance = new bignumber_js_1.BigNumber(config.minimum_balance_used);
                console.log(`totalWeight:=${deviseTotal.totalWeight} / weightUsed:=${config.balanceWeightUsed}`);
                if (deviseTotal.totalWeight > 0 && config.balanceWeightUsed > 0) {
                    const toUse = deviseTotal.total //total x weight / totalWeight
                        .multipliedBy(config.balanceWeightUsed)
                        .dividedBy(deviseTotal.totalWeight);
                    console.log(`${toUse.toNumber()} = ${deviseTotal.total.toNumber()} * ${config.balanceWeightUsed} / ${deviseTotal.totalWeight}`);
                    if (toUse.isGreaterThan(fromBalance)) {
                        this.log(`adjusting from weight, using ${toUse.toNumber()} instead of ${fromBalance.toNumber()}`);
                        fromBalance = toUse;
                    }
                }
                // now adjust possibly the ouput
                if (from.available.isLessThan(config.minimum_balance_used)) {
                    console.log(`balance (${from.available}) is less than minimum (${config.minimum_balance_used}), recomputing`);
                    fromBalance = from.available;
                }
                const priceToSellCurrentTick = (price === null || price === void 0 ? void 0 : price.multipliedBy(config.sell_coef)) || new bignumber_js_1.BigNumber(0);
                const lastBuyComplete = this.last(orders, 'buy');
                if (toBalance.isGreaterThan(configuration.minimumSizeTo)) {
                    // in from
                    this.log(`we sell !, count(orders) := ${orders.length} :: `
                        + `${toBalance.toNumber()} is greater than ${configuration.minimumSizeTo.toNumber()}`);
                    const managed = yield this.manageSellingOrder(config, configuration, toBalance, priceToSellCurrentTick, orders, lastBuyComplete);
                    this.log('managed?', managed);
                    return managed;
                }
                const managed = yield this.manageBuyingOrder(config, configuration, tick, price, fromBalance);
                if (managed)
                    return true;
                throw 'out of the loop without either error or request sent... ?';
            }
            catch (err) {
                this.error(`having ${err}`, err);
            }
            return false;
        });
        this.started = false;
        this.aggregator = new WalletAggregator_1.default(tickHolder.database(), exchange.name());
        this.accountStat = new account_1.AccountStat(exchange, configs, ordersHolders);
        const log = (text, value) => this.log(text, value);
        this.manageBuy = new type_manager_1.ManageBuy(exchange, tickHolder.database(), devises, log, ordersHolders);
        this.manageSell = new type_manager_1.ManageSell(exchange, tickHolder.database(), devises, log, ordersHolders);
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.aggregator.start();
            this.afterTickStarted();
        }
    }
    manageBuyingOrder(config, configuration, tick, price, fromBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            // return promise boolean
            return this.manageBuy.manage(config, configuration, {
                tick,
                price,
                fromBalance,
            });
        });
    }
    manageSellingOrder(config, configuration, toBalance, priceToSellCurrentTick, orders, lastBuyComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            // return promise boolean
            return this.manageSell.manage(config, configuration, {
                toBalance,
                priceToSellCurrentTick,
                orders,
                lastBuyComplete,
            });
        });
    }
    wallets(from, to, raw) {
        return __awaiter(this, void 0, void 0, function* () {
            return wallet_1.default.list(this.database(), this.exchange.name(), from, to);
        });
    }
    walletsRaw(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            return wallet_1.default.listRaw(this.database(), this.exchange.name(), from, to);
        });
    }
    walletAggregated(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            return wallet_aggregation_1.default.list(this.database(), this.exchange.name(), from, to);
        });
    }
    manageWallets(array) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallets = [];
            Object.keys(array).forEach((k) => {
                const { expectedValue, currentValue } = array[k];
                this.log(`managing for ${k} ; expected := ${expectedValue.toNumber()} ; current := ${currentValue}`);
                const timestamp = new bignumber_js_1.BigNumber(new Date().getTime());
                const wallet = new wallet_1.default(this.exchange.name(), timestamp, k, expectedValue, currentValue);
                wallets.push(wallet);
            });
            let i = 0;
            while (i < wallets.length) {
                try {
                    yield wallets[i].save(this.database());
                }
                catch (err) {
                    this.error(`Error saving wallet ${wallets[i].devise}`, err);
                }
                i++;
            }
        });
    }
    afterTickStarted() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let i = 0;
                yield this.load_configuration();
                const array = {};
                while (i < this.configs.length) {
                    const config = this.configs[i];
                    const { from, to } = config;
                    try {
                        const [expectedValue, currentValue] = yield this.expectedValue(config);
                        if (!array[from]) {
                            array[from] = {
                                expectedValue: new bignumber_js_1.BigNumber(0),
                                currentValue: new bignumber_js_1.BigNumber(0),
                            };
                        }
                        array[from].expectedValue = array[from].expectedValue.plus(expectedValue);
                        array[from].currentValue = array[from].currentValue.plus(currentValue);
                    }
                    catch (e) {
                        this.error('Error in config', e);
                    }
                    i++;
                }
                yield this.manageWallets(array);
                const stats = yield this.accountStat.stats();
                i = 0;
                while (i < this.configs.length) {
                    const config = this.configs[i];
                    const stat = stats.values.find(v => v.devise === config.from);
                    yield this.fullfillOrder(config, stat);
                    i++;
                }
            }
            catch (err) {
                this.error("Having exception to handle", err);
            }
            setTimeout(() => this.afterTickStarted(), 60000);
        });
    }
    ;
}
exports.default = TradeEngine;
//# sourceMappingURL=TradeEngine.js.map