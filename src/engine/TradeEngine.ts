import { Devise } from './../cex/instance';
import { BigNumber } from 'bignumber.js';
import Cex from "../cex/instance";
import { Database } from "../database";
import TickHolder from "./TickHolder";
import Tick from "../database/models/ticks";
import Orders from "./orders";
import Order from '../database/models/order';


BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

export interface DeviseConfig {
  name: Devise,
  decimals: number
  minimum: number
  decimals_price?: number
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

  private minimum(devise?: Devise) {
    if(!devise) return 0.01;
    const object = this.devises.get(devise);
    if(!object) return 0.01;
    return object.minimum || 0.01;
  }

  private decimals(devise?: Devise) {
    if(!devise) return 2;
    const object = this.devises.get(devise);
    if(!object) return 2;
    return object.decimals || 2;
  }

  private decimalsPrice(devise?: Devise) {
    if(!devise) return 2;
    const object = this.devises.get(devise);
    if(!object) return 2;
    const decimals = object.decimals_price;
    if(undefined !== decimals && null !== decimals) return decimals;
    return object.decimals || 2;
  }

  private _fullfillOrder = async (config: TradeConfig) => {
    try {
      const results = await Promise.all([
        Tick.last(this.database(), config.to, config.from),
        this.ordersHolders.list(config.from, config.to)
      ]);

      const tick = results[0];
      var orders = results[1] || [];

      if(!tick) return false;

      var price = tick.last;
      if(!price) return false;
    
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

      //get the account balance
      const {balances} = await Cex.instance.account_balance()
      const from = balances[config.from];
      const to = balances[config.to];
      //console.log("account_balance " + balances[config.from].available.toFixed(), from);
      //console.log("account_balance " + balances[config.to].available.toFixed(), to);

      const to_balance = to.available;
      var from_balance = from.available;

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

      const priceToSell = price?.multipliedBy(config.sell_coef);
      const totalExpectedAfterSell = to_balance.multipliedBy(priceToSell).toNumber();

      if(to_balance.isGreaterThan(0.1) && totalExpectedAfterSell > 20) { //in from
        console.log("we sell !, count(orders) := " + orders.length);
        if(last_order) {
          if(last_order && "sell" == last_order.type) {
            console.error(`INVALID LAST ODER, having := ${last_order.str()}`);
            throw `INVALID LAST ODER, having := ${last_order.str()}`;
          }

          //TODO recalculate price to buy from above
          /*if(!price || last_order.price.isGreaterThan(price))*/ //price = last_order.price;
        }

        if(!priceToSell) return false;

        // creating an instance of big number which will ceil (round to the higher decimal number)
        const BigNumberCeil = BigNumber.clone({ ROUNDING_MODE: BigNumber.ROUND_CEIL});

        //clone the original price to sell
        const priceWhichWhillCeil = new BigNumberCeil(priceToSell);
        const balance_to_use = to_balance; //.multipliedBy(0.99);
        //calculate the amount of element to consume
        const amount = balance_to_use.decimalPlaces(this.decimals(config.to)).toNumber();

        //using the config.to's decimal price -> will still be using a decimal of 'from'
        var number_decimals_price = this.decimalsPrice(config.to);

        while(number_decimals_price >= 0) {
          try {
            // send the request
            const placePrice = priceWhichWhillCeil.decimalPlaces(number_decimals_price).toNumber();
            console.log(`amount ? ${amount} / placePrice ? ${placePrice}`);
            await Cex.instance.place_order(config.to, config.from, "sell", amount, placePrice);

            orders = await this.ordersHolders.list(config.from, config.to);
            console.log("now orders := ", orders.map(o => o.str()));

            return true;
          } catch(e) {
            if(`${e}`.indexOf("Invalid price") < 0 || number_decimals_price == 0) throw e;

            number_decimals_price --;
            console.log("Error with price, trying less decimals", number_decimals_price);
          }
        }

        throw "out of the loop without either error or request sent... ?";
      } else {
        if(tick.priceChangePercentage && tick.priceChangePercentage.isGreaterThan(config.maximum_price_change_percent)) {
          throw`The price change ${tick.priceChangePercentage.toFixed()}% is > than ${config.maximum_price_change_percent}% - stopping`;
        }
        console.log("we buy ! " + tick.high.toFixed() + " " +tick.low.toFixed() + price.toFixed());
        var average = tick.high.plus(tick.low.multipliedBy(1)).dividedBy(2); //avg(high, low)
        average = average.plus(price).dividedBy(2); //avg(price, avg(high, low))

        var priceToBuy = average.multipliedBy(config.buy_coef);
        var amount = from_balance.dividedBy(priceToBuy);

        var total = amount.multipliedBy(priceToBuy);
        var total_balance = from_balance.multipliedBy(0.95);

        // really need to fix this ugly one, easy however had to take doggo out :p

        const is_currently_lower = priceToBuy.isLessThanOrEqualTo(price);
        if(!is_currently_lower) {
          //throw `ERROR : priceToBuy := ${priceToBuy.toFixed()} is lower than the price := ${price}`;
          priceToBuy = price.multipliedBy(0.95);
        }

        priceToBuy = priceToBuy.decimalPlaces(this.decimalsPrice(config.to));
        console.log(`will use price ${priceToBuy} -> maximum ${this.decimalsPrice(config.to)} decimals`);

        if(total.decimalPlaces(this.decimals(config.to)).toNumber() > 0) {
          const to_subtract = Math.pow(10, -this.decimals(config.to));
          console.log(`10^-${this.decimals(config.to)} = ${to_subtract}`);
          do {
            amount = amount.minus(to_subtract);

            total = amount.multipliedBy(priceToBuy);
          } while(total.isGreaterThanOrEqualTo(total_balance));
          console.log(`fixing amount:${amount.toFixed(this.decimals(config.to))} total:${total.toFixed(this.decimals(config.from))} total_balance:${total_balance}(${from_balance})`);
        }

        const is_bigger_than_minimum = amount.comparedTo(this.minimum(config.to)) >= 0;

        if(!is_bigger_than_minimum) {
          throw `ERROR : amount := ${amount.toFixed()} is lower than the minimum := ${this.minimum(config.to)}`;
        }

        if(total_balance.toNumber() <= 2) { //2€/usd etc
          throw `ERROR : invalid total balance ${total_balance.toNumber()}`;
        }

        //get the final amount, floor to the maximum number of decimals to use => floor is ok, even in worst cases, it will be using less balance than expected
        const final_amount = amount.decimalPlaces(this.decimals(config.to)).toNumber();


        var number_decimals_price = this.decimalsPrice(config.to);

        while(number_decimals_price >= 0) {
          try {
            // send the request
            //get the final price, floor to the maximum number of decimals to use => floor is ok since it will still be lower than the expected price (lower is better)
            const final_price_to_buy = priceToBuy.decimalPlaces(number_decimals_price).toNumber();
            console.log(`final_amount amount:${final_amount} final_price_to_buy ${final_price_to_buy}`);

            await Cex.instance.place_order(config.to, config.from, "buy", final_amount, final_price_to_buy);
        
            orders = await this.ordersHolders.list(config.from, config.to);
            console.log("now orders := ", orders.map(o => o.str()));
            return true;

          } catch(e) {
            if(`${e}`.indexOf("Invalid price") < 0 || number_decimals_price == 0) throw e;

            number_decimals_price --;
            console.log("Error with price, trying less decimals", number_decimals_price);
          }
        }
        throw "out of the loop without either error or request sent... ?";
      }
    } catch(err) {
      console.error(`having ${err}`, err);
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