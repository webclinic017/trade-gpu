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
const order_1 = __importDefault(require("../database/models/order"));
const wallet_1 = __importDefault(require("../database/models/wallet"));
const InternalTradeEngine_1 = __importDefault(require("./InternalTradeEngine"));
bignumber_js_1.BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: bignumber_js_1.BigNumber.ROUND_FLOOR });
class TradeEngine extends InternalTradeEngine_1.default {
    constructor(devises, configs, exchange, tickHolder, ordersHolders) {
        super(devises, configs, exchange, tickHolder, ordersHolders);
        this.fullfillOrder = (config) => __awaiter(this, void 0, void 0, function* () {
            const { from, to } = config;
            this.log(`managing for ${from}->${to}`);
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
                const from = balances[config.from];
                const to = balances[config.to];
                // this.log("from", from);
                // this.log("to", to);
                // this.log("account_balance " + balances[config.from].available.toFixed(), from);
                // this.log("account_balance " + balances[config.to].available.toFixed(), to);
                const toBalance = to.available;
                let fromBalance = from.available;
                if (fromBalance.isGreaterThan(config.maximum_balance_used)) {
                    fromBalance = new bignumber_js_1.BigNumber(config.maximum_balance_used);
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
                const managed = this.manageBuyingOrder(config, configuration, tick, price, fromBalance);
                throw 'out of the loop without either error or request sent... ?';
            }
            catch (err) {
                this.error(`having ${err}`, err);
            }
            return false;
        });
        this.afterTickStarted = () => __awaiter(this, void 0, void 0, function* () {
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
            i = 0;
            while (i < this.configs.length) {
                yield this.fullfillOrder(this.configs[i]);
                i++;
            }
            setTimeout(() => this.afterTickStarted(), 60000);
        });
        this.started = false;
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.afterTickStarted();
        }
    }
    manageBuyingOrder(config, configuration, tick, price, fromBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tick.priceChangePercentage
                && tick.priceChangePercentage.isGreaterThan(config.maximum_price_change_percent)) {
                throw `The price change ${tick.priceChangePercentage.toFixed()}% is > than ${config.maximum_price_change_percent}% - stopping`;
            }
            this.log(`we buy ! ${tick.high.toFixed()} ${tick.low.toFixed()}${price.toFixed()}`);
            let average = tick.high.plus(tick.low.multipliedBy(1)).dividedBy(2); // avg(high, low)
            average = average.plus(price).dividedBy(2); // avg(price, avg(high, low))
            let priceToBuy = average.multipliedBy(config.buy_coef);
            let amount = fromBalance.dividedBy(priceToBuy);
            let total = amount.multipliedBy(priceToBuy);
            const totalBalance = fromBalance.multipliedBy(0.95);
            // really need to fix this ugly one, easy however had to take doggo out :p
            const isCurrentlyLower = priceToBuy.isLessThanOrEqualTo(price);
            if (!isCurrentlyLower) {
                // throw `ERROR : priceToBuy := ${priceToBuy.toFixed()} is lower than price := ${price}`;
                priceToBuy = price.multipliedBy(0.95);
            }
            priceToBuy = priceToBuy.decimalPlaces(configuration.pricePrecision);
            this.log(`will use price ${priceToBuy} -> maximum ${configuration.pricePrecision} decimals`);
            if (amount.isGreaterThan(0)
                && total.decimalPlaces(configuration.pricePrecision).toNumber() > 0) {
                const toSubtract = Math.pow(10, -this.decimals(config.to));
                this.log(`10^-${this.decimals(config.to)} = ${toSubtract}`);
                do {
                    amount = amount.minus(toSubtract);
                    total = amount.multipliedBy(priceToBuy);
                } while (total.isGreaterThanOrEqualTo(totalBalance));
                this.log(`fixing amount:${amount.toFixed(this.decimals(config.to))} total:${total.toFixed(this.decimals(config.from))} totalBalance:${totalBalance}(${fromBalance})`);
            }
            const isBiggerThanMinimum = amount.comparedTo(configuration.minimumSizeTo) >= 0;
            if (!isBiggerThanMinimum) {
                throw `ERROR : amount := ${amount.toFixed()} is lower than the minimum := ${configuration.minimumSizeTo}`;
            }
            if (totalBalance.toNumber() <= 2) {
                // 2€/usd etc
                throw `ERROR : invalid total balance ${totalBalance.toNumber()}`;
            }
            // get the final amount, floor to the maximum number of decimals to use => floor is ok,
            // even in worst cases, it will be using less balance than expected
            const finalAmount = amount
                .decimalPlaces(this.decimals(config.to))
                .toNumber();
            let numberDecimalsPrice = configuration.pricePrecision;
            while (numberDecimalsPrice >= 0) {
                try {
                    // send the request
                    // get the final price, floor to the maximum number of decimals to use => floor is ok
                    // since it will still be lower than the expected price (lower is better)
                    const finalPriceToBuy = priceToBuy
                        .decimalPlaces(numberDecimalsPrice)
                        .toNumber();
                    this.log(`finalAmount amount:${finalAmount} finalPriceToBuy ${finalPriceToBuy}`);
                    yield this.exchange.place_order(config.to, config.from, 'buy', finalAmount, finalPriceToBuy);
                    const newOrders = yield this.ordersHolders.list(config.from, config.to);
                    this.log('new orders := ', newOrders.map((o) => o.str()));
                    return true;
                }
                catch (e) {
                    if (`${e}`.indexOf('Invalid price') < 0 || numberDecimalsPrice === 0)
                        throw e;
                    numberDecimalsPrice--;
                    this.log('Error with price, trying less decimals', numberDecimalsPrice);
                }
            }
            return false;
        });
    }
    manageSellingOrder(config, configuration, toBalance, priceToSellCurrentTick, orders, lastBuyComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lastBuyComplete) {
                let result = yield this.exchange.history_orders(config.to, config.from);
                // the result is ordered by time ->
                result = result.reverse();
                const lastBuy = result.find((order) => order.type === 'buy');
                if (lastBuy) {
                    const order = order_1.default.from(lastBuy, this.exchange.name());
                    yield order.save(this.database());
                    this.log("fixed last known transaction for buy order, it's now := ", order.json());
                    lastBuyComplete = order;
                }
                else {
                    throw `Can't manage selling ${config.to} -> ${config.from}, no buy order is known`;
                }
            }
            else if (lastBuyComplete.type !== 'buy') {
                throw `INVALID, last order was not buy, having := ${lastBuyComplete.str()}`;
            }
            const originalPrice = lastBuyComplete.price.dividedBy(config.buy_coef);
            if (originalPrice.isNaN())
                throw 'ERROR with nan result while trying to sell';
            // we recompute the original price to get the actual expected sell_coef
            const expectedPriceToSell = originalPrice.multipliedBy(config.sell_coef);
            // and now we set the greater price - in case price dropped unexpectendly
            const sellPrice = priceToSellCurrentTick.isGreaterThan(expectedPriceToSell)
                ? priceToSellCurrentTick
                : expectedPriceToSell;
            this.log('total expected devise  :=', toBalance.multipliedBy(sellPrice).toNumber());
            this.log('current  selling price :=', priceToSellCurrentTick.toNumber());
            this.log('expected selling price :=', expectedPriceToSell.toNumber());
            // creating an instance of big number which will ceil (round to the higher decimal number)
            const BigNumberCeil = bignumber_js_1.BigNumber.clone({
                ROUNDING_MODE: bignumber_js_1.BigNumber.ROUND_CEIL,
            });
            // clone the original price to sell
            const priceWhichWhillCeil = new BigNumberCeil(sellPrice);
            const balanceToUse = toBalance; // .multipliedBy(0.99);
            // calculate the amount of element to consume
            const amount = balanceToUse
                .decimalPlaces(this.decimals(config.to))
                .toNumber();
            // using the config.to's decimal price -> will still be using a decimal of 'from'
            let numberDecimalsPrice = configuration.pricePrecision; // this.decimalsPrice(config.to);
            while (numberDecimalsPrice >= 0) {
                try {
                    // send the request
                    const placePrice = priceWhichWhillCeil
                        .decimalPlaces(numberDecimalsPrice)
                        .toNumber();
                    this.log(`amount ? ${amount} / placePrice ? ${placePrice}`);
                    yield this.exchange.place_order(config.to, config.from, 'sell', amount, placePrice);
                    orders = yield this.ordersHolders.list(config.from, config.to);
                    this.log('now orders := ', orders.map((o) => o.str()));
                    return true;
                }
                catch (e) {
                    if (`${e}`.indexOf('Invalid price') < 0 || numberDecimalsPrice === 0)
                        throw e;
                    numberDecimalsPrice--;
                    this.log('Error with price, trying less decimals', numberDecimalsPrice);
                }
            }
            throw 'out of the loop without either error or request sent... ?';
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
}
exports.default = TradeEngine;
//# sourceMappingURL=TradeEngine.js.map