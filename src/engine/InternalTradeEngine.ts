import { BigNumber } from 'bignumber.js';
import { Database } from '../database';
import TickHolder from './TickHolder';
import Tick from '../database/models/ticks';
import Orders from './orders';
import Order from '../database/models/order';
import Wallet from '../database/models/wallet';
import { CurrencyLimit, Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';

BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

export interface DeviseConfig {
  name: Devise;
  decimals: number;
  minimum: number;
  decimals_price?: number;
}

export interface TradeConfig {
  from: Devise;
  to: Devise;
  buy_coef: number;
  sell_coef: number;
  maximum_price_change_percent: number;
  maximum_balance_used: number;
}

export default class InternalTradeEngine {
  protected currencyLimits?: CurrencyLimit[];

  constructor(
    protected devises: Map<Devise, DeviseConfig>,
    protected configs: TradeConfig[],
    protected exchange: AbstractExchange,
    protected tickHolder: TickHolder,
    protected ordersHolders: Orders,
  ) {}

  protected log(text: string, arg?: any) {
    if (arguments.length > 1) console.log(`${this.exchange.name()} ${text}`, arg);
    else console.log(`${this.exchange.name()} ${text}`);
  }

  protected error(text: string, arg?: any) {
    if (arguments.length > 1) console.error(`${this.exchange.name()} ${text}`, arg);
    else console.error(`${this.exchange.name()} ${text}`);
  }

  public async load_configuration(): Promise<CurrencyLimit[]> {
    if (this.currencyLimits) return this.currencyLimits;
    this.currencyLimits = (await this.exchange.currency_limits()) || [];
    return this.currencyLimits;
  }

  protected database(): Database {
    return this.tickHolder.database();
  }

  protected currency(from?: Devise, to?: Devise): CurrencyLimit | null {
    if (!this.currencyLimits) throw 'invalid configuration';

    return (
      this.currencyLimits.find((cl) => cl.from === from && cl.to === to) || null
    );
  }

  protected decimals(devise?: Devise) {
    if (!devise) return 2;
    const object = this.devises.get(devise);
    if (!object) return 2;
    let { decimals } = object;
    if (decimals === null || undefined === decimals) decimals = 0;
    if (decimals < 0) decimals = 0;
    return decimals;
  }

  protected async expectedValue(
    config: TradeConfig,
  ): Promise<[BigNumber, BigNumber]> {
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

      if (!tick) throw 'no tick';

      const price = tick.last;
      if (!price) throw 'no last price';

      const current = orders.filter((o) => {
        if (!o.completed && o.type === 'sell') return true;
        if (o.type !== 'buy') return false;
        return !o.timeout || !o.completed; // every buy which is valid
      });

      const expectedValue = current
        .map((order) => order.price.multipliedBy(order.amount))
        .reduce((p, c) => p.plus(c), new BigNumber(0));

      const currentValue = current
        .map((order) => tick.last.multipliedBy(order.amount))
        .reduce((p, c) => p.plus(c), new BigNumber(0));
      return [expectedValue, currentValue];
    } catch (e) {
      return [new BigNumber(0), new BigNumber(0)];
    }
  }

  protected last(orders: Order[], type: 'sell' | 'buy') {
    return orders
      .filter((o) => o.type === type)
      .reduce((left: Order | null, right: Order) => {
        if (!left) return right;
        if (!right) return left;
        return left.timestamp.isGreaterThan(right.timestamp) ? left : right;
      }, null);
  }
}
