import { Database } from '../database';
import Order from '../database/models/order';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import { Devise } from '../exchanges/defs';

/*
order placed
{
  complete: false,
  id: '11587333881',
  time: 1580227252384,
  pending: '0.50000000',
  amount: '0.50000000',
  type: 'sell',
  price: '160.17'
}
*/

export default class Orders {
  private database: Database;

  private loaded: boolean;

  private orders: Order[];

  constructor(private exchange: AbstractExchange, database: Database) {
    this.database = database;
    this.loaded = false;
    this.orders = [];
  }

  public async list(
    from: Devise,
    to: Devise,
  ): Promise<{ from: Devise; to: Devise; orders: Order[] }> {
    try {
      const orders = await this.filter(from, to);
      return { from, to, orders };
    } catch (err) {
      return { from, to, orders: [] };
    }
  }

  public async init() {
    if (this.loaded) return;
    const list = await Order.list(this.database, this.exchange.name());
    this.loaded = true;
    this.orders = list;
  }

  public async fetch(from: Devise, to: Devise): Promise<Order[]> {
    await this.filter(from, to);
    const shortOrders = await this.exchange.open_orders();

    const obtainedOrders = shortOrders.map((o) => Order.from(o, this.exchange.name()));
    const newOrders = obtainedOrders.filter((o) => !o.isIn(this.orders));
    const toSave: Order[] = [];

    // check for orders to fix
    const toFix: Order[] = [];
    shortOrders.forEach((order) => {
      const cache = this.orders.find((o) => o.txid.isEqualTo(order.id));
      if (!!cache && cache.completed) {
        console.log('order to fix its completion status !');
        toFix.push(cache);
        cache.completed = false;
      }
    });

    // saving cached orders
    await Promise.all(toFix.map((o) => o.save(this.database)));

    newOrders.forEach((o) => (o.completed = false));
    this.orders.forEach(
      (o) => !o.completed && !o.isIn(obtainedOrders) && toSave.push(o),
    );
    toSave.forEach((o) => (o.completed = true));

    toSave.length > 0
      && console.log(
        'order finished !',
        toSave.map((o) => o.json()),
      );
    newOrders.length > 0
      && console.log(
        'order new !',
        newOrders.map((o) => o.json()),
      );

    if (newOrders.length > 0) {
      await Promise.all(toSave.map((o) => o.save(this.database)));
      const orders = await Promise.all(
        newOrders.map((o) => o.save(this.database)),
      );
      console.log(
        'saved',
        orders.map((o) => o.json()),
      );
      orders.forEach((o) => this.orders.push(o));
    } else {
      await Promise.all(toSave.map((o) => o.save(this.database)));
    }

    return this.filter(from, to);
  }

  public filter(from: Devise, to: Devise) {
    if (this.loaded) {
      return this.orders.filter(
        (order) => order.left === to && order.right === from,
      );
    }

    // from = FIAT and to = CRYPTO for instance
    return this.orders.filter(
      (order) => order.left === to && order.right === from,
    );
  }
}
