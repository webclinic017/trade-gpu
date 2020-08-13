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
  sell_coef: number,
  maximum_price_change_percent: number,
  maximum_balance_used: number
}

export default class TradeEngine {
  private _callback: () => void = () => this._afterTickStarted();
  private _started: boolean;

  constructor(private devises: Map<Devise,DeviseConfig>, private configs: TradeConfig[], private tickHolder: TickHolder, private ordersHolders: Orders) {
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

  private _fullfillOrder = async (config: TradeConfig) => {
    try {
      const results = await Promise.all([
        Tick.last(this.database(), config.to, config.from),
        this.ordersHolders.list(config.from, config.to)
      ]);

      const tick = results[0];
      var orders = results[1] || [];

      var price = tick.last;
    
      const current = orders.filter(o => !o.completed);
    
      //already have an order to fullfill
      if(current.length > 0) {
        const order = current[0];
        const timediff = Math.floor(tick.timestamp.multipliedBy(1000).minus(order.timestamp).dividedBy(1000).toNumber());
        if(timediff > 12*3600 && order.type == "buy") {
          console.log("created width a diff of " + timediff);
          console.log("timeout !");
          const result = await Cex.instance.cancel_order(order.txid.toFixed());
          console.log(`tx ${order.txid} canceled`, result);
          order.timeout = true;
          return !!(await order.save(this.database()));
        }
        console.log(current.map(o=>o.str()).join("\n"));
        return true;
      }

      if(tick.priceChangePercentage && tick.priceChangePercentage.isGreaterThan(config.maximum_price_change_percent)) {
        throw`The price change % is > than ${config.maximum_price_change_percent}% - stopping`;
      }

      //get the account balance
      const balance = await Cex.instance.account_balance()
      const from = balance[config.from];
      const to = balance[config.to];
      console.log("account_balance " + from, balance[config.from].available.toFixed());
      console.log("account_balance " + to, balance[config.to].available.toFixed());
      const to_balance = balance[config.to].available;
      var from_balance = balance[config.from].available;

      if(from_balance.isGreaterThan(config.maximum_balance_used)) {
        from_balance = new BigNumber(config.maximum_balance_used);
      }

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

        const priceToBuy = average.multipliedBy(config.buy_coef);
        const amount = from_balance.multipliedBy(0.99).dividedBy(priceToBuy);
        console.log(`buy at price ${priceToBuy.toFixed()} (${tick.low.toFixed()}/${tick.high.toFixed()})`);
        console.log("buying " + amount.decimalPlaces(2).toFixed()+" at price " + priceToBuy.decimalPlaces(2).toFixed());

        if(amount.isGreaterThan(0.05) && priceToBuy.isLessThanOrEqualTo(price)) {
          await Cex.instance.place_order(config.to, config.from, "buy", amount.decimalPlaces(2).toNumber(), priceToBuy.decimalPlaces(2).toNumber());
          
          orders = await this.ordersHolders.list(config.from, config.to);
          console.log("now orders := ", orders.map(o => o.str()));
          return true;
        } else {
          throw "ERROR : amount := " + amount.toFixed()+" priceToBuy := "+priceToBuy.toFixed();
        }
      } else {
        console.log("we sell !, count(orders) := " + orders.length);
        if(last_order) {
          if(last_order && "sell" == last_order.type) {
            console.error(`INVALID LAST ODER, having := ${last_order.str()}`);
            throw `INVALID LAST ODER, having := ${last_order.str()}`;
          }

          //TODO recalculate price to buy from above
          /*if(!price || last_order.price.isGreaterThan(price))*/ price = last_order.price;
          console.log(`set price at ${price.toNumber()} (last ${last_order.price.toNumber()})`);
        }

        const priceToSell = price?.multipliedBy(config.sell_coef);

        console.log("sell at price ", priceToSell?.toFixed())
        if(!priceToSell) return false;

        const balance_to_use = to_balance.multipliedBy(0.99);
        console.log("selling " + balance_to_use.decimalPlaces(2).toFixed()+" at price " + priceToSell.decimalPlaces(2).toFixed());
        await Cex.instance.place_order(config.to, config.from, "sell", balance_to_use.decimalPlaces(2).toNumber(), priceToSell.decimalPlaces(2).toNumber());
        
        orders = await this.ordersHolders.list(config.from, config.to);
        console.log("now orders := ", orders.map(o => o.str()));
        return true;
      }
    } catch(err) {
      console.error(err);
    }

    return false;
  }

  private _afterTickStarted = async () => {
    var i = 0;
    while( i < this.configs.length) {
      const config = this.configs[i];
      const { from, to } = config;
      console.log(`managing for ${from}->${to}`)
      await this._fullfillOrder(config);
      i++;
    }

    setTimeout(this._callback, 60000);
  }
}