import TradeEngine, { DeviseConfig } from '../engine/TradeEngine';
import TickHolder from '../engine/TickHolder';
import Orders from '../engine/orders';
import { Devise, DeviseNames } from '../exchanges/defs';
import { getDeviseConfigArray } from './DeviceConfigArray';
import { getTradeConfigArray } from './TradeConfigArray';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import Order from '../database/models/order';

export class Runner {
  private pairs: [Devise, Devise][] = [];

  private tickHolder: TickHolder;

  private ordersHolders: Orders;

  private tradeEngine: TradeEngine;

  public constructor(private exchange: AbstractExchange) {
    const configs = getTradeConfigArray();
    const devises: Map<Devise, DeviseConfig> = new Map<Devise, DeviseConfig>();
    const decimals = getDeviseConfigArray();
    decimals.forEach((d) => devises.set(d.name, d));

    this.tickHolder = new TickHolder(exchange);
    this.ordersHolders = new Orders(exchange, this.tickHolder.database());

    this.tradeEngine = new TradeEngine(
      devises,
      configs,
      exchange,
      this.tickHolder,
      this.ordersHolders,
    );

    this.pairs = [
      ...DeviseNames.map((crypto) => ['EUR', crypto] as [Devise, Devise]),
      ...DeviseNames.map((crypto) => ['USD', crypto] as [Devise, Devise]),
    ].filter(([left, right]) => left !== right);

    this.pairs.forEach(([left, right]) => this.tickHolder.register(left, right));
  }

  public async orders(): Promise<
    { from: Devise; to: Devise; orders: Order[] }[]
    > {
    try {
      return Promise.all(
        this.pairs.map(([left, right]) => this.ordersHolders.list(left, right)),
      );
    } catch (err) {
      return [];
    }
  }

  public async wallets() {
    return this.tradeEngine.wallets();
  }

  public async start() {
    try {
      await this.tickHolder.start();
      console.log(`${this.exchange.name()} trade engine starting...`);
      this.tradeEngine.start();
    } catch (err) {
      console.error('starting error', err);
    }
  }
}
