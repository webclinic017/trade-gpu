import Cex from "../cex/instance";
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

  list(): Promise<Order[]> {
    return this.internalList()
    .then(list => {
      return Cex.instance.open_orders()
      .then(shortOrders => {
        const obtainedOrders = shortOrders.map(o => Order.from(o));
        const new_orders = obtainedOrders.filter(o => !o.isIn(this._list));
        const to_save: Order[] = [];

        new_orders.forEach(o => o.completed = false);
        this._list.forEach(o => !o.completed && !o.isIn(obtainedOrders) && to_save.push(o));
        to_save.forEach(o => o.completed = true);

        (to_save.length > 0) && console.log("order finished !", to_save);
        (new_orders.length > 0) && console.log("order new !", new_orders);

        if(new_orders.length > 0) {
          return Promise.all(to_save.map(o => o.save(this.database)))
          .then(() => Promise.all(new_orders.map(o => o.save(this.database))))
          .then((orders: Order[]) => {
            console.log("saved", orders);
            orders.forEach(o => this._list.push(o));
            return this.internalList();
          })
        } else {
          return Promise.all(to_save.map(o => o.save(this.database)))
          .then(() => this.internalList());
        }
      })
    });
  }

  private internalList() {
    if(this.loaded) return Promise.resolve(this._list);
    else {
      return Order.list(this.database)
      .then(list => {
        this.loaded = true;
        this._list = list;
        //this._to_complete = this._list.filter(o => !o.completed);
        return list;
      })
    }
  }
}