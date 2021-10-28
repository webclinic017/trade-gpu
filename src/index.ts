import { Devise, DeviseNames } from './cex/instance';
import TradeEngine, { TradeConfig, DeviseConfig } from "./engine/TradeEngine";
import TickHolder from "./engine/TickHolder";
import Orders from "./engine/orders";

const tickHolder = new TickHolder();
const ordersHolders = new Orders(tickHolder.database());


const decimals: DeviseConfig[] = [{
  name: "EUR",
  decimals: 2,
  minimum: 0.01
}, {
  name: "XRP",
  decimals: 2,
  minimum: 0.01
}, {
  name: "LTC",
  decimals: 2, //4,
  minimum: 0.01
}, {
  name: "ETH",
  decimals: 2, //4,
  minimum: 0.01
}, {
  name: "DASH",
  decimals: 2,
  minimum: 0.01
}, {
  name: "BTC",
  decimals: 5,
  decimals_price: 0,
  minimum: 0.0001
}, {
  name: "DOGE",
  decimals: 1,
  minimum: 50
}, {
  name: "ADA",
  decimals: 2,
  minimum: 0.01
}, {
  name: "SHIB",
  decimals: 2,
  decimals_price: 10,
  minimum: 0.01
}];

const devises: Map<Devise, DeviseConfig> = new Map<Devise, DeviseConfig>();
decimals.forEach(d => devises.set(d.name, d));

const configs: TradeConfig[] = [
  {
    from: "EUR",
    to: "ETH",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 10,
    maximum_balance_used: 200
  }, {
    from: "EUR",
    to: "XRP",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 8,
    maximum_balance_used: 100
  }, {
    from: "EUR",
    to: "LTC",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }, {
    from: "EUR",
    to: "BTC",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 10,
    maximum_balance_used: 200
  }, {
    from: "USD",
    to: "DOGE",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 5,
    maximum_balance_used: 100
  }, {
    from: "EUR",
    to: "DASH",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 10,
    maximum_balance_used: 160
  }, {
    from: "USD",
    to: "ADA",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }, {
    from: "USD",
    to: "SHIB",
    buy_coef: 0.995,
    sell_coef: 1.028,
    maximum_price_change_percent: 5,
    maximum_balance_used: 200
  }
];

const tradeEngine = new TradeEngine(devises, configs, tickHolder, ordersHolders);

[
  ...DeviseNames.map(crypto => (["EUR", crypto]) as [Devise, Devise]),
  ...DeviseNames.map(crypto => (["USD", crypto]) as [Devise, Devise]),
]
.forEach(tuple => tickHolder.register(tuple[0], tuple[1]));


tickHolder.start()
.then(() => {
  console.log("trade engine starting...");
  tradeEngine.start();
})
.catch(err => console.log(err));