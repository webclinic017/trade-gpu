import BigNumber from 'bignumber.js';
import { TradeConfig } from '../InternalTradeEngine';
import { AbstractExchange } from '../../exchanges/AbstractExchange';
import { Devise } from '../../exchanges/defs';
import Orders from '../orders';
import Order from '../../database/models/order';

type PartialRecord<K extends string, T> = { [P in K]?: T };

type DeviseWeight = { devise: Devise; weight: number };
type DeviseHolder = PartialRecord<Devise, { to: DeviseWeight[] }>;

interface StatTuple {
  from: Devise;
  to: Devise;
  order?: Order;
  solde: BigNumber;
  weight: number;
}

export interface DeviseTotal {
  devise: Devise;
  total: BigNumber;
  totalWeight: number;
}

export interface Stat {
  values: DeviseTotal[];
  tuples: StatTuple[];
}

export default class AccountStat {
  constructor(
    private exchange: AbstractExchange,
    private configs: TradeConfig[],
    private ordersHolders: Orders,
  ) {}

  public async stats(): Promise<Stat> {
    const tuples: StatTuple[] = [];
    const values: DeviseTotal[] = [];
    const { balances } = await this.exchange.account_balance();

    const wrapper: DeviseHolder = {};

    this.configs.forEach(({ from, to, balanceWeightUsed }) => {
      const holder = wrapper[from]
        || (() => (wrapper[from] = { to: [] }))();

      const values = holder.to;
      if (!values.find((v) => v.devise === to)) values.push({ devise: to, weight: balanceWeightUsed });
    });

    const froms = Object.keys(wrapper) as Devise[];

    froms.forEach((from) => {
      const totalHolder = values.find((v) => v.devise === from)
        || (() => {
          const holder = {
            devise: from,
            total: new BigNumber(0),
            totalWeight: 0,
          };
          values.push(holder);
          return holder;
        })();

      const holder = wrapper[from];
      if (!holder) return;
      const devises = holder.to;

      const all: DeviseWeight[] = [{ devise: from, weight: 0 }, ...devises];
      console.log(`information about ${from} :=`);

      all.forEach(({ devise, weight }) => {
        const balance = balances[devise];
        console.log(
          `  ${devise} => available : ${balance.available.toNumber()}`,
        );
        console.log(`  ${devise} => orders    : ${balance.orders.toNumber()}`);

        const orders = this.ordersHolders.filter(from, devise);
        const current = orders.filter((o) => !o.completed).find((o) => !!o);
        if (!current) return;

        const expectedValue = current.price.multipliedBy(current.amount);
        if (current.type === 'buy') {
          console.log(`  ${devise} => buy    : ${expectedValue.toNumber()}`);
        } else {
          console.log(`  ${devise} => sell   : ${expectedValue.toNumber()}`);
        }

        totalHolder.total = totalHolder.total.plus(expectedValue);
        totalHolder.totalWeight += weight;

        tuples.push({
          from,
          to: devise,
          order: current,
          solde: expectedValue,
          weight,
        });
      });
    });

    return { values, tuples };
  }
}
