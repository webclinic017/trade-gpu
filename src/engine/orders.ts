import Cex, { Devise } from "../cex/instance";
import { Database } from "../database";
import Order from "../database/models/order";

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
  private _list: Order[];

  constructor(database: Database) {
    this.database = database;
    this.loaded = false;
    this._list = [];
  }

  list = async (from: Devise, to: Devise): Promise<Order[]> => {
    const list = await this.internalList(from, to);
    const shortOrders = await Cex.instance.open_orders();

    const obtainedOrders = shortOrders.map(o => Order.from(o));
    const new_orders = obtainedOrders.filter(o => !o.isIn(this._list));
    const to_save: Order[] = [];

    new_orders.forEach(o => o.completed = false);
    this._list.forEach(o => !o.completed && !o.isIn(obtainedOrders) && to_save.push(o));
    to_save.forEach(o => o.completed = true);

    (to_save.length > 0) && console.log("order finished !", to_save.map(o => o.json()));
    (new_orders.length > 0) && console.log("order new !", new_orders.map(o => o.json()));

    if(new_orders.length > 0) {
      await Promise.all(to_save.map(o => o.save(this.database)))
      const orders = await Promise.all(new_orders.map(o => o.save(this.database)))
      console.log("saved", orders.map(o => o.json()));
      orders.forEach(o => this._list.push(o));
    } else {
      await Promise.all(to_save.map(o => o.save(this.database)));
    }

    return this.internalList(from, to);
  }

  private internalList = async (from: Devise, to: Devise) => {
    if(this.loaded) return this._list.filter(order => order.left == to && order.right == from);
    else {
      const list = await Order.list(this.database)
      this.loaded = true;
      this._list = list;
      //this._to_complete = this._list.filter(o => !o.completed);
      return list.filter(order => order.left == to && order.right == from); //from = FIAT and to = CRYPTO for instance
    }
  }
}