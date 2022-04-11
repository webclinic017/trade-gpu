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
const order_1 = __importDefault(require("../../database/models/order"));
const abstract_1 = __importDefault(require("./abstract"));
class ManageSell extends abstract_1.default {
    manage(config, configuration, { toBalance, priceToSellCurrentTick, orders, lastBuyComplete, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lastBuyComplete) {
                let result = yield this.exchange.history_orders(config.to, config.from);
                // the result is ordered by time ->
                result = result.reverse();
                const lastBuy = result.find((order) => order.type === 'buy');
                if (lastBuy) {
                    const order = order_1.default.from(lastBuy, this.exchange.name());
                    yield order.save(this.database);
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
                    orders = yield this.ordersHolders.fetch(config.from, config.to);
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
}
exports.default = ManageSell;
//# sourceMappingURL=sell.js.map