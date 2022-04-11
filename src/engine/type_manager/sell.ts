import { BigNumber } from 'bignumber.js';
import { TradeConfig } from '../InternalTradeEngine';
import { CurrencyLimit } from '../../exchanges/defs/CurrencyLimit';
import Order from '../../database/models/order';
import ManageAbstract from './abstract';

export interface ManageSellConfig {
  toBalance: BigNumber;
  priceToSellCurrentTick: BigNumber;
  orders: Order[];
  lastBuyComplete?: Order | null;
}

export default class ManageSell extends ManageAbstract<ManageSellConfig> {
  public async manage(
    config: TradeConfig,
    configuration: CurrencyLimit,
    {
      toBalance,
      priceToSellCurrentTick,
      orders,
      lastBuyComplete,
    }: ManageSellConfig,
  ): Promise<boolean> {
    if (!lastBuyComplete) {
      let result = await this.exchange.history_orders(config.to, config.from);

      // the result is ordered by time ->
      result = result.reverse();
      const lastBuy = result.find((order) => order.type === 'buy');

      if (lastBuy) {
        const order = Order.from(lastBuy, this.exchange.name());
        await order.save(this.database);

        this.log(
          "fixed last known transaction for buy order, it's now := ",
          order.json(),
        );
        lastBuyComplete = order;
      } else {
        throw `Can't manage selling ${config.to} -> ${config.from}, no buy order is known`;
      }
    } else if (lastBuyComplete.type !== 'buy') {
      throw `INVALID, last order was not buy, having := ${lastBuyComplete.str()}`;
    }

    const originalPrice = lastBuyComplete.price.dividedBy(config.buy_coef);

    if (originalPrice.isNaN()) throw 'ERROR with nan result while trying to sell';
    // we recompute the original price to get the actual expected sell_coef
    const expectedPriceToSell = originalPrice.multipliedBy(config.sell_coef);
    // and now we set the greater price - in case price dropped unexpectendly
    const sellPrice = priceToSellCurrentTick.isGreaterThan(expectedPriceToSell)
      ? priceToSellCurrentTick
      : expectedPriceToSell;
    this.log(
      'total expected devise  :=',
      toBalance.multipliedBy(sellPrice).toNumber(),
    );
    this.log('current  selling price :=', priceToSellCurrentTick.toNumber());
    this.log('expected selling price :=', expectedPriceToSell.toNumber());

    // creating an instance of big number which will ceil (round to the higher decimal number)
    const BigNumberCeil = BigNumber.clone({
      ROUNDING_MODE: BigNumber.ROUND_CEIL,
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
        await this.exchange.place_order(
          config.to,
          config.from,
          'sell',
          amount,
          placePrice,
        );

        orders = await this.ordersHolders.fetch(config.from, config.to);
        this.log(
          'now orders := ',
          orders.map((o) => o.str()),
        );

        return true;
      } catch (e) {
        if (`${e}`.indexOf('Invalid price') < 0 || numberDecimalsPrice === 0) throw e;

        numberDecimalsPrice--;
        this.log('Error with price, trying less decimals', numberDecimalsPrice);
      }
    }

    throw 'out of the loop without either error or request sent... ?';
  }
}
