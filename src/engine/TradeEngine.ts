import { Devise } from './../cex/instance';
import { BigNumber } from 'bignumber.js';
import Cex from "../cex/instance";
import { Database } from "../database";
import TickHolder from "./TickHolder";
import Tick from "../database/models/ticks";
import Orders from "./orders";
import Order from '../database/models/order';


BigNumber.set({ DECIMAL_PLACES: 2 })

export interface DeviseConfig {
  name: Devise,
  decimals: number
}

export interface TradeConfig {
  from: Devise,
  to: Devise,
  buy_coef: number,
  sell_coef: number
}

export default class TradeEngine {
  private _callback: () => void = () => this._afterTickStarted();
  private _started: boolean;

  constructor(private devises: Map<Devise,DeviseConfig>, private config: TradeConfig, private tickHolder: TickHolder, private ordersHolders: Orders) {
    this._started = false;
  }

  private database(): Database {
    return this.tickHolder.database();
  }
 
  public start() {
    if(!this._started) {
      this._started = true;
      this._callback();
    }
  }

  private _afterTickStarted() {
    Promise.all([
      Tick.last(this.database(), this.config.to, this.config.from),
      this.ordersHolders.list()
    ])
    .then(results => {
      const tick = results[0];
      const orders = results[1] || [];

      var price = tick.last;

    
      const current = orders.filter(o => !o.completed);
    
      //already have an order to fullfill
      if(current.length > 0) {
        const order = current[0];
        const timediff = Math.floor(tick.timestamp.multipliedBy(1000).minus(order.timestamp).dividedBy(1000).toNumber());
        if(timediff > 12*3600 && order.type == "buy") {
          console.log("created width a diff of " + timediff);
          console.log("timeout !");
          return Cex.instance.cancel_order(order.txid.toFixed())
          .then(result => {
            console.log(`tx ${order.txid} canceled`, result);
            order.timeout = true;
            return order.save(this.database())
          })
          .then(order => !!order);
        }
        console.log(current.map(o=>o.str()).join("\n"));
        return Promise.resolve(true);
      }

      if(tick.priceChangePercentage && tick.priceChangePercentage.isGreaterThan(5)) {
        return Promise.reject("The price change % is > than 5% - stopping");
      }
    
      //get the account balance
      return Cex.instance.account_balance()
      .then(balance => {
        const from = balance[this.config.from];
        const to = balance[this.config.to];
        console.log("account_balance " + from, balance[this.config.from].available.toFixed());
        console.log("account_balance " + to, balance[this.config.to].available.toFixed());
        const to_balance = balance[this.config.to].available;
        const from_balance = balance[this.config.from].available;

        var last_order: Order|null = orders && orders.length > 0 ? orders.reduce((left, right) => {
          if(left && !right) return left;
          if(right && !left) return right;
          return left.timestamp.isGreaterThan(right.timestamp) ? left : right;
        }) : null;
        const last_was_ok = last_order && last_order.completed;
        const last_was_sell_ok = last_was_ok && last_order && last_order.type == "sell";
        const last_was_buy_ok = last_was_ok && last_order && last_order.type == "buy";

        if(tick && price && (to_balance.isLessThan(0.1) || last_was_sell_ok)) {
          console.log("we buy !");
          var average = tick.high.plus(tick.low.multipliedBy(1)).dividedBy(2); //avg(high, low)
          average = average.plus(price).dividedBy(2); //avg(price, avg(high, low))

          const priceToBuy = average.multipliedBy(this.config.buy_coef);
          const amount = from_balance.multipliedBy(0.99).dividedBy(priceToBuy);
          console.log(`buy at price ${priceToBuy.toFixed()} (${tick.low.toFixed()}/${tick.high.toFixed()})`);
          console.log("buying " + amount.decimalPlaces(2).toFixed()+" at price " + priceToBuy.decimalPlaces(2).toFixed());

          if(amount.isGreaterThan(0.05) && priceToBuy.isLessThanOrEqualTo(price)) {
            return Cex.instance.place_order(this.config.to, this.config.from, "buy", amount.decimalPlaces(2).toNumber(), priceToBuy.decimalPlaces(2).toNumber())
            .then(() => this.ordersHolders.list())
            .then(orders => {
              console.log("now orders := ", orders.map(o => o.str()));
              return true;
            })
          } else {
            throw "ERROR : amount := " + amount.toFixed()+" priceToBuy := "+priceToBuy.toFixed();
          }
      } else {
          console.log("we sell !, count(orders) := " + orders.length);
          if(last_order) {
            if(last_order && "sell" == last_order.type) {
              console.error(`INVALID LAST ODER, having := ${last_order.str()}`);
              return Promise.reject(`INVALID LAST ODER, having := ${last_order.str()}`);
            }

            //TODO recalculate price to buy from above
            /*if(!price || last_order.price.isGreaterThan(price))*/ price = last_order.price;
            console.log(`set price at ${price.toNumber()} (last ${last_order.price.toNumber()})`);
          }

          const priceToSell = price?.multipliedBy(this.config.sell_coef);

          console.log("sell at price ", priceToSell?.toFixed())
          if(!priceToSell) return Promise.resolve(false);

          const balance_to_use = to_balance.multipliedBy(0.99);
          console.log("selling " + balance_to_use.decimalPlaces(2).toFixed()+" at price " + priceToSell.decimalPlaces(2).toFixed());
          return Cex.instance.place_order(this.config.to, this.config.from, "sell", balance_to_use.decimalPlaces(2).toNumber(), priceToSell.decimalPlaces(2).toNumber())
          .then(() => this.ordersHolders.list())
          .then(orders => {
            console.log("now orders := ", orders.map(o => o.str()));
            return true;
          });
        }
      });
    })
    .then(done => {
      setTimeout(this._callback, 60000);
    })
    .catch(err => {
      console.error(err);
      setTimeout(this._callback, 60000);
    });
  }
}