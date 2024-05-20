import { BigNumber } from 'bignumber.js';
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
import WalletAggregated from '../database/models/wallet_aggregation';
import WalletAggregator from './WalletAggregator';
import { AccountStat, DeviseTotal } from './account';

import { ManageBuy, ManageSell } from './type_manager';

export { DeviseConfig, TradeConfig } from './InternalTradeEngine';

BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

interface DeviseValue {
  [key: string]: { expectedValue: BigNumber; currentValue: BigNumber };
}

export default class TradeEngine extends InternalTradeEngine {
  private started: boolean;

  private aggregator: WalletAggregator;

  private manageBuy: ManageBuy;

  private manageSell: ManageSell;

  private accountStat: AccountStat;

  constructor(
    devises: Map<Devise, DeviseConfig>,
    configs: TradeConfig[],
    exchange: AbstractExchange,
    tickHolder: TickHolder,
    ordersHolders: Orders,
  ) {
    super(configs, exchange, tickHolder, ordersHolders);
    this.started = false;
    this.aggregator = new WalletAggregator(
      tickHolder.database(),
      exchange.name(),
    );

    this.accountStat = new AccountStat(exchange, configs, ordersHolders);

    const log = (text: string, value?: any) => this.log(text, value);
    this.manageBuy = new ManageBuy(
      exchange,
      tickHolder.database(),
      devises,
      log,
      ordersHolders,
    );
    this.manageSell = new ManageSell(
      exchange,
      tickHolder.database(),
      devises,
      log,
      ordersHolders,
    );
  }

  public start() {
    if (!this.started) {
      this.started = true;
      this.aggregator.start();
      this.afterTickStarted();
    }
  }

  private fullfillOrder = async (
    config: TradeConfig,
    deviseTotal: DeviseTotal = {
      devise: config.from,
      total: new BigNumber(0),
      totalWeight: 0,
    },
  ) => {
    const { from, to } = config;
    this.log(
      `managing for ${from}->${to}, max can be ${deviseTotal.total.toNumber()}`,
    );

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
      let fromBalance = new BigNumber(config.minimum_balance_used);

      console.log(
        `totalWeight:=${deviseTotal.totalWeight} / weightUsed:=${config.balanceWeightUsed}`,
      );

      if (deviseTotal.totalWeight > 0 && config.balanceWeightUsed > 0) {
        const toUse = deviseTotal.total // total x weight / totalWeight
          .multipliedBy(config.balanceWeightUsed)
          .dividedBy(deviseTotal.totalWeight);

        console.log(
          `${toUse.toNumber()} = ${deviseTotal.total.toNumber()} * ${
            config.balanceWeightUsed
          } / ${deviseTotal.totalWeight}`,
        );

        if (toUse.isGreaterThan(fromBalance)) {
          this.log(
            `adjusting from weight, using ${toUse.toNumber()} instead of ${fromBalance.toNumber()}`,
          );
          fromBalance = toUse;
        }
      }

      // now adjust possibly the ouput
      if (from.available.isLessThan(config.minimum_balance_used)) {
        console.log(
          `balance (${from.available}) is less than minimum (${config.minimum_balance_used}), recomputing`,
        );
        fromBalance = from.available;
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

        // we will try making a buy order
        if (!!managed) {
          return managed;
        }
      }

      const managed = await this.manageBuyingOrder(
        config,
        configuration,
        tick,
        price,
        fromBalance,
      );

      if (managed) return true;

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
    // return promise boolean
    return this.manageBuy.manage(config, configuration, {
      tick,
      price,
      fromBalance,
    });
  }

  /**
   * Manage selling
   * Note : future implementation would need to return an explicit enum for better understanding
   * 
   * @throws Will throw any trading exception. This can be considered failure compared to the return value
   * 
   * @returns a flag telling if the sell order management was a success or false if the balance would have been 0
   */
  private async manageSellingOrder(
    config: TradeConfig,
    configuration: CurrencyLimit,
    toBalance: BigNumber,
    priceToSellCurrentTick: BigNumber,
    orders: Order[],
    lastBuyComplete?: Order | null,
  ): Promise<boolean> {
    // return promise boolean
    return this.manageSell.manage(config, configuration, {
      toBalance,
      priceToSellCurrentTick,
      orders,
      lastBuyComplete,
    });
  }

  public async wallets(from?: Date, to?: Date, raw?: boolean) {
    return Wallet.list(this.database(), this.exchange.name(), from, to);
  }

  public async walletsRaw(from?: Date, to?: Date) {
    return Wallet.listRaw(this.database(), this.exchange.name(), from, to);
  }

  public async walletAggregated(from?: Date, to?: Date) {
    return WalletAggregated.list(
      this.database(),
      this.exchange.name(),
      from,
      to,
    );
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

  private async afterTickStarted() {
    try {
      let i = 0;

      await this.load_configuration();

      const array: DeviseValue = {};
      while (i < this.configs.length) {
        const config = this.configs[i];
        const { from, to } = config;
        try {
          const [expectedValue, currentValue] = await this.expectedValue(
            config,
          );
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

      const stats = await this.accountStat.stats();

      i = 0;
      while (i < this.configs.length) {
        const config = this.configs[i];
        const stat = stats.values.find((v) => v.devise === config.from);
        await this.fullfillOrder(config, stat);
        i++;
      }
    } catch (err) {
      this.error('Having exception to handle', err);
    }

    setTimeout(() => this.afterTickStarted(), 60000);
  }
}
