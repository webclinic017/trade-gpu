import { BigNumber } from 'bignumber.js';
import Tick from '../../database/models/ticks';
import { CurrencyLimit } from '../../exchanges/defs/CurrencyLimit';
import { TradeConfig } from '../InternalTradeEngine';
import ManageAbstract from './abstract';

interface ManageBuyConfig {
  tick: Tick;
  price: BigNumber;
  fromBalance: BigNumber;
}

export default class ManageBuy extends ManageAbstract<ManageBuyConfig> {
  public async manage(
    config: TradeConfig,
    configuration: CurrencyLimit,
    { tick, price, fromBalance }: ManageBuyConfig,
  ): Promise<boolean> {
    if (
      tick.priceChangePercentage
      && tick.priceChangePercentage.isGreaterThan(
        config.maximum_price_change_percent,
      )
    ) {
      throw `The price change ${tick.priceChangePercentage.toFixed()}% is > than ${
        config.maximum_price_change_percent
      }% - stopping`;
    }
    this.log(
      `we buy ! ${tick.high.toFixed()} ${tick.low.toFixed()}${price.toFixed()}`,
    );
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
    this.log(
      `will use price ${priceToBuy} -> maximum ${configuration.pricePrecision} decimals`,
    );

    if (
      amount.isGreaterThan(0)
      && total.decimalPlaces(configuration.pricePrecision).toNumber() > 0
    ) {
      const toSubtract = 10 ** -this.decimals(config.to);
      this.log(`10^-${this.decimals(config.to)} = ${toSubtract}`);
      do {
        amount = amount.minus(toSubtract);

        total = amount.multipliedBy(priceToBuy);
      } while (total.isGreaterThanOrEqualTo(totalBalance));
      this.log(
        `fixing amount:${amount.toFixed(
          this.decimals(config.to),
        )} total:${total.toFixed(
          this.decimals(config.from),
        )} totalBalance:${totalBalance}(${fromBalance})`,
      );
    }

    const isBiggerThanMinimum = amount.comparedTo(configuration.minimumSizeTo) >= 0;

    if (!isBiggerThanMinimum) {
      throw `ERROR : amount := ${amount.toFixed()} is lower than the minimum := ${
        configuration.minimumSizeTo
      }`;
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
        this.log(
          `finalAmount amount:${finalAmount} finalPriceToBuy ${finalPriceToBuy}`,
        );

        await this.exchange.place_order(
          config.to,
          config.from,
          'buy',
          finalAmount,
          finalPriceToBuy,
        );

        const newOrders = await this.ordersHolders.fetch(
          config.from,
          config.to,
        );
        this.log(
          'new orders := ',
          newOrders.map((o) => o.str()),
        );
        return true;
      } catch (e) {
        if (`${e}`.indexOf('Invalid price') < 0 || numberDecimalsPrice === 0) throw e;

        numberDecimalsPrice--;
        this.log('Error with price, trying less decimals', numberDecimalsPrice);
      }
    }

    return false;
  }
}
