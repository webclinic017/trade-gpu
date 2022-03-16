import { BigNumber } from 'bignumber.js';
import { Database } from '../database';
import TickHolder from './TickHolder';
import Tick from '../database/models/ticks';
import Orders from './orders';
import Order from '../database/models/order';
import Wallet from '../database/models/wallet';
import { CurrencyLimit, Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import InternalTradeEngine, {
  DeviseConfig,
  TradeConfig,
} from './InternalTradeEngine';

export { DeviseConfig, TradeConfig } from './InternalTradeEngine';

BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

interface DeviseValue {
  [key: string]: { expectedValue: BigNumber; currentValue: BigNumber };
}

export default class TradeEngine extends InternalTradeEngine {
  private started: boolean;

  constructor(
    devises: Map<Devise, DeviseConfig>,
    configs: TradeConfig[],
    exchange: AbstractExchange,
    tickHolder: TickHolder,
    ordersHolders: Orders,
  ) {
    super(devises, configs, exchange, tickHolder, ordersHolders);
    this.started = false;
  }

  public start() {
    if (!this.started) {
      this.started = true;
      this.afterTickStarted();
    }
  }

  private fullfillOrder = async (config: TradeConfig) => {
    const { from, to } = config;
    this.log(`managing for ${from}->${to}`);

    try {
      const results = await Promise.all([
        Tick.last(
          this.database(),
          this.exchange.name(),
          config.to,
          config.from,
        ),
        this.ordersHolders.fetch(config.from, config.to),
      ]);

      const configuration = this.currency(config.from, config.to);
      if (!configuration) throw `couldn't load configuration for ${config.from} Ò-> ${config.to}`;

      const tick = results[0];
      const orders = results[1] || [];

      if (!tick) return false;

      const price = tick.last;
      if (!price) return false;

      const current = orders.filter((o) => !o.completed);

      // already have an order to fullfill
      if (current.length > 0) {
        const order = current[0];
        const timediff = Math.floor(
          tick.timestamp
            .multipliedBy(1000)
            .minus(order.timestamp)
            .dividedBy(1000)
            .toNumber(),
        );
        if (timediff > 12 * 3600 && order.type === 'buy') {
          this.log(`created width a diff of ${timediff}`);
          this.log('timeout !');
          const result = await this.exchange.cancel_order(order.txid.toFixed());
          this.log(`tx ${order.txid} canceled`, result);
          order.timeout = true;
          return !!(await order.save(this.database()));
        }
        this.log(current.map((o) => o.str()).join('\n'));
        return true;
      }

      // get the account balance
      const { balances } = await this.exchange.account_balance();
      const from = balances[config.from];
      const to = balances[config.to];
      // this.log("from", from);
      // this.log("to", to);
      // this.log("account_balance " + balances[config.from].available.toFixed(), from);
      // this.log("account_balance " + balances[config.to].available.toFixed(), to);

      const toBalance = to.available;
      let fromBalance = from.available;

      if (fromBalance.isGreaterThan(config.maximum_balance_used)) {
        fromBalance = new BigNumber(config.maximum_balance_used);
      }

      const priceToSellCurrentTick = price?.multipliedBy(config.sell_coef) || new BigNumber(0);
      const lastBuyComplete = this.last(orders, 'buy');

      if (toBalance.isGreaterThan(configuration.minimumSizeTo)) {
        // in from
        this.log(
          `we sell !, count(orders) := ${orders.length} :: `
            + `${toBalance.toNumber()} is greater than ${configuration.minimumSizeTo.toNumber()}`,
        );
        const managed = await this.manageSellingOrder(
          config,
          configuration,
          toBalance,
          priceToSellCurrentTick,
          orders,
          lastBuyComplete,
        );
        this.log('managed?', managed);

        return managed;
      }

      const managed = this.manageBuyingOrder(
        config,
        configuration,
        tick,
        price,
        fromBalance,
      );

      throw 'out of the loop without either error or request sent... ?';
    } catch (err) {
      this.error(`having ${err}`, err);
    }

    return false;
  };

  private async manageBuyingOrder(
    config: TradeConfig,
    configuration: CurrencyLimit,
    tick: Tick,
    price: BigNumber,
    fromBalance: BigNumber,
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

  private async manageSellingOrder(
    config: TradeConfig,
    configuration: CurrencyLimit,
    toBalance: BigNumber,
    priceToSellCurrentTick: BigNumber,
    orders: Order[],
    lastBuyComplete?: Order | null,
  ) {
    if (!lastBuyComplete) {
      let result = await this.exchange.history_orders(config.to, config.from);

      // the result is ordered by time ->
      result = result.reverse();
      const lastBuy = result.find((order) => order.type === 'buy');

      if (lastBuy) {
        const order = Order.from(lastBuy, this.exchange.name());
        await order.save(this.database());

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

  public async wallets(from?: Date, to?: Date, raw?: boolean) {
    return Wallet.list(this.database(), this.exchange.name(), from, to);
  }

  public async walletsRaw(from?: Date, to?: Date) {
    return Wallet.listRaw(this.database(), this.exchange.name(), from, to);
  }

  private async manageWallets(array: DeviseValue) {
    const wallets: Wallet[] = [];
    Object.keys(array).forEach((k) => {
      const { expectedValue, currentValue } = array[k];
      this.log(
        `managing for ${k} ; expected := ${expectedValue.toNumber()} ; current := ${currentValue}`,
      );

      const timestamp = new BigNumber(new Date().getTime());
      const wallet = new Wallet(
        this.exchange.name(),
        timestamp,
        k,
        expectedValue,
        currentValue,
      );
      wallets.push(wallet);
    });

    let i = 0;
    while (i < wallets.length) {
      try {
        await wallets[i].save(this.database());
      } catch (err) {
        this.error(`Error saving wallet ${wallets[i].devise}`, err);
      }
      i++;
    }
  }

  private afterTickStarted = async () => {
    let i = 0;

    await this.load_configuration();

    const array: DeviseValue = {};
    while (i < this.configs.length) {
      const config = this.configs[i];
      const { from, to } = config;
      try {
        const [expectedValue, currentValue] = await this.expectedValue(config);
        if (!array[from]) {
          array[from] = {
            expectedValue: new BigNumber(0),
            currentValue: new BigNumber(0),
          };
        }
        array[from].expectedValue = array[from].expectedValue.plus(expectedValue);
        array[from].currentValue = array[from].currentValue.plus(currentValue);
      } catch (e) {
        this.error('Error in config', e);
      }
      i++;
    }

    await this.manageWallets(array);

    i = 0;
    while (i < this.configs.length) {
      await this.fullfillOrder(this.configs[i]);
      i++;
    }

    setTimeout(() => this.afterTickStarted(), 60000);
  };
}
