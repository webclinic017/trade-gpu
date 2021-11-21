import { CurrencyLimit, Devise } from './../cex/instance';
import { BigNumber } from 'bignumber.js';
import Cex from "../cex/instance";
import { Database } from "../database";
import TickHolder from "./TickHolder";
import Tick from "../database/models/ticks";
import Orders from "./orders";
import Order from '../database/models/order';


BigNumber.set({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

interface DeviseValue {
  [key: string]: {expected_value: BigNumber, current_value: BigNumber};
}

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
  private _currency_limits?: CurrencyLimit[];

  constructor(private devises: Map<Devise,DeviseConfig>, private configs: TradeConfig[], private tickHolder: TickHolder, private ordersHolders: Orders) {
    this._started = false;
  }

  public async load_configuration(): Promise<CurrencyLimit[]> {
    if(this._currency_limits) return this._currency_limits;
    this._currency_limits = await Cex.instance.currency_limits();
    return this._currency_limits;
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

  private currency(from?: Devise, to?: Devise): CurrencyLimit|null {
    if(!this._currency_limits) throw "invalid configuration";

    return this._currency_limits.find(cl => cl.from == from && cl.to == to) || null;
  }

  private decimals(devise?: Devise) {
    if(!devise) return 2;
    const object = this.devises.get(devise);
    if(!object) return 2;
    var { decimals } = object;
    if(null === decimals || undefined === decimals) decimals = 0;
    if(decimals < 0) decimals = 0;
    return decimals;
  }

  private async expectedValue(config: TradeConfig): Promise<[BigNumber, BigNumber]> {
    try {
      const results = await Promise.all([
        Tick.last(this.database(), config.to, config.from),
        this.ordersHolders.list(config.from, config.to)
      ]);

      const configuration = this.currency(config.from, config.to);
      if(!configuration) throw `couldn't load configuration for ${config.from} Ò-> ${config.to}`;

      const tick = results[0];
      var orders = results[1] || [];

      if(!tick) throw "no tick";

      var price = tick.last;
      if(!price) throw "no last price";
    
      const current = orders.filter(o => !o.completed && o.type == "sell");

      var expected_value = current.map(order => order.price.multipliedBy(order.amount))
        .reduce((p, c) => p.plus(c), new BigNumber(0));

      var current_value = current.map(order => tick.last.multipliedBy(order.amount))
      .reduce((p, c) => p.plus(c), new BigNumber(0));
      return [expected_value, current_value];
    } catch(e) {
      return [new BigNumber(0), new BigNumber(0)];
    }
  }

  private _fullfillOrder = async (config: TradeConfig) => {
    try {
      const results = await Promise.all([
        Tick.last(this.database(), config.to, config.from),
        this.ordersHolders.list(config.from, config.to)
      ]);

      const configuration = this.currency(config.from, config.to);
      if(!configuration) throw `couldn't load configuration for ${config.from} Ò-> ${config.to}`;

      const tick = results[0];
      const orders = results[1] || [];

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
      //console.log("from", from);
      //console.log("to", to);
      //console.log("account_balance " + balances[config.from].available.toFixed(), from);
      //console.log("account_balance " + balances[config.to].available.toFixed(), to);

      const to_balance = to.available;
      var from_balance = from.available;

      if(from_balance.isGreaterThan(config.maximum_balance_used)) {
        from_balance = new BigNumber(config.maximum_balance_used);
      }

      const price_to_sell_current_tick = price?.multipliedBy(config.sell_coef) || new BigNumber(0);
      const last_buy_complete = this.last(orders, "buy");

      if(to_balance.isGreaterThan(configuration.minimumSizeTo)) { //in from
        console.log(`we sell !, count(orders) := ${orders.length} :: ` +
          `${to_balance.toNumber()} is greater than ${configuration.minimumSizeTo.toNumber()}`);
        const managed = await this.manageSellingOrder(config, configuration, to_balance, price_to_sell_current_tick, orders, last_buy_complete);
        console.log("managed?", managed);

        return managed;
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

        priceToBuy = priceToBuy.decimalPlaces(configuration.pricePrecision);
        console.log(`will use price ${priceToBuy} -> maximum ${configuration.pricePrecision} decimals`);

        if(amount.isGreaterThan(0) && total.decimalPlaces(configuration.pricePrecision).toNumber() > 0) {
          const to_subtract = Math.pow(10, -this.decimals(config.to));
          console.log(`10^-${this.decimals(config.to)} = ${to_subtract}`);
          do {
            amount = amount.minus(to_subtract);

            total = amount.multipliedBy(priceToBuy);
          } while(total.isGreaterThanOrEqualTo(total_balance));
          console.log(`fixing amount:${amount.toFixed(this.decimals(config.to))} total:${total.toFixed(this.decimals(config.from))} total_balance:${total_balance}(${from_balance})`);
        }

        const is_bigger_than_minimum = amount.comparedTo(configuration.minimumSizeTo) >= 0;

        if(!is_bigger_than_minimum) {
          throw `ERROR : amount := ${amount.toFixed()} is lower than the minimum := ${configuration.minimumSizeTo}`;
        }

        if(total_balance.toNumber() <= 2) { //2€/usd etc
          throw `ERROR : invalid total balance ${total_balance.toNumber()}`;
        }

        //get the final amount, floor to the maximum number of decimals to use => floor is ok, even in worst cases, it will be using less balance than expected
        const final_amount = amount.decimalPlaces(this.decimals(config.to)).toNumber();


        var number_decimals_price = configuration.pricePrecision;

        while(number_decimals_price >= 0) {
          try {
            // send the request
            //get the final price, floor to the maximum number of decimals to use => floor is ok since it will still be lower than the expected price (lower is better)
            const final_price_to_buy = priceToBuy.decimalPlaces(number_decimals_price).toNumber();
            console.log(`final_amount amount:${final_amount} final_price_to_buy ${final_price_to_buy}`);

            await Cex.instance.place_order(config.to, config.from, "buy", final_amount, final_price_to_buy);
        
            const new_orders = await this.ordersHolders.list(config.from, config.to);
            console.log("new orders := ", new_orders.map(o => o.str()));
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

  private async manageSellingOrder(config: TradeConfig,
    configuration: CurrencyLimit,
    to_balance: BigNumber,
    price_to_sell_current_tick: BigNumber,
    orders: Order[],
    last_buy_complete?: Order|null) {

    if (!last_buy_complete) {
      throw `Can't manage selling ${config.to} -> ${config.from}, no buy order is known`;
    } else if("buy" != last_buy_complete.type) {
      throw `INVALID, last order was not buy, having := ${last_buy_complete.str()}`;
    }


    const original_price = last_buy_complete.price.dividedBy(config.buy_coef);

    if(original_price.isNaN()) throw "ERROR with nan result while trying to sell";
    // we recompute the original price to get the actual expected sell_coef
    const expected_price_to_sell = original_price.multipliedBy(config.sell_coef);
    // and now we set the greater price - in case price dropped unexpectendly
    const sell_price = price_to_sell_current_tick.isGreaterThan(expected_price_to_sell) ? price_to_sell_current_tick : expected_price_to_sell;
    console.log("total expected devise  :=", to_balance.multipliedBy(sell_price).toNumber());
    console.log("current  selling price :=", price_to_sell_current_tick.toNumber());
    console.log("expected selling price :=", expected_price_to_sell.toNumber());


    // creating an instance of big number which will ceil (round to the higher decimal number)
    const BigNumberCeil = BigNumber.clone({ ROUNDING_MODE: BigNumber.ROUND_CEIL});

    //clone the original price to sell
    const priceWhichWhillCeil = new BigNumberCeil(sell_price);
    const balance_to_use = to_balance; //.multipliedBy(0.99);
    //calculate the amount of element to consume
    const amount = balance_to_use.decimalPlaces(this.decimals(config.to)).toNumber();

    //using the config.to's decimal price -> will still be using a decimal of 'from'
    var number_decimals_price = configuration.pricePrecision;// this.decimalsPrice(config.to);

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
  }

  private _afterTickStarted = async () => {
    var i = 0;

    await this.load_configuration();

    const array: DeviseValue = {};
    while( i < this.configs.length) {
      const config = this.configs[i];
      const { from, to } = config;
      try {
        const [expected_value, current_value] = await this.expectedValue(config);
        if(!array[from]) array[from] = {expected_value: new BigNumber(0), current_value: new BigNumber(0)};
        array[from].expected_value = array[from].expected_value.plus(expected_value)
        array[from].current_value = array[from].current_value.plus(current_value)
      } catch(e) {

      }
      i++;
    }


    Object.keys(array).forEach(k => {
      const {expected_value, current_value} = array[k];
      console.log(`managing for ${k} ; expected := ${expected_value.toNumber()} ; current := ${current_value}`)
    });

    i = 0;
    while( i < this.configs.length) {
      const config = this.configs[i];
      const { from, to } = config;
      console.log(`managing for ${from}->${to}`)
      await this._fullfillOrder(config);
      i++;
    }

    setTimeout(this._callback, 60000);
  }

  private last(orders: Order[], type: "sell"|"buy") {
    return orders.filter(o => o.type == type).reduce((left: Order|null, right: Order) => {
      if(!left) return right;
      if(!right) return left;
      return left.timestamp.isGreaterThan(right.timestamp) ? left : right;
    }, null);
  }
}