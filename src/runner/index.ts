import TradeEngine, { DeviseConfig } from '../engine/TradeEngine';
import TickHolder from '../engine/TickHolder';
import Orders from '../engine/orders';
import { Devise, DeviseNames } from '../exchanges/defs';
import { getDeviseConfigArray } from './DeviceConfigArray';
import { getTradeConfigArray } from './TradeConfigArray';
import cex from '../exchanges/cex';
import { AbstractExchange } from '../exchanges/AbstractExchange';

export class Runner {
  private tickHolder: TickHolder;

  private ordersHolders: Orders;

  private tradeEngine: TradeEngine;

  public constructor(private exchange: AbstractExchange) {
    const configs = getTradeConfigArray();
    const devises: Map<Devise, DeviseConfig> = new Map<Devise, DeviseConfig>();
    const decimals = getDeviseConfigArray();
    decimals.forEach((d) => devises.set(d.name, d));

    this.tickHolder = new TickHolder(cex);
    this.ordersHolders = new Orders(cex, this.tickHolder.database());

    this.tradeEngine = new TradeEngine(
      devises,
      configs,
      cex,
      this.tickHolder,
      this.ordersHolders,
    );

    [
      ...DeviseNames.map((crypto) => ['EUR', crypto] as [Devise, Devise]),
      ...DeviseNames.map((crypto) => ['USD', crypto] as [Devise, Devise]),
    ].forEach((tuple) => this.tickHolder.register(tuple[0], tuple[1]));
  }

  public start() {
    this.tickHolder
      .start()
      .then(() => {
        console.log(`${this.exchange.name()} trade engine starting...`);
        this.tradeEngine.start();
      })
      .catch((err) => console.log(err));
  }
}
