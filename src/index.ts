import { Devise } from './cex/instance';
import TradeEngine, { TradeConfig, DeviseConfig } from "./engine/TradeEngine";
import TickHolder from "./engine/TickHolder";
import Orders from "./engine/orders";

const tickHolder = new TickHolder();
const ordersHolders = new Orders(tickHolder.database());


const decimals: DeviseConfig[] = [{
  name: "EUR",
  decimals: 2
}, {
  name: "XRP",
  decimals: 2
}, {
  name: "LTC",
  decimals: 4 
}, {
  name: "ETH",
  decimals: 4
}, {
  name: "DASH",
  decimals: 2
}];

const devises: Map<Devise, DeviseConfig> = new Map<Devise, DeviseConfig>();
decimals.forEach(d => devises.set(d.name, d));

const configs: TradeConfig[] = [
  {
    from: "EUR",
    to: "ETH",
    buy_coef: 0.995,
    sell_coef: 1.015,
    maximum_price_change_percent: 5,
    maximum_balance_used: 200
  }, {
    from: "EUR",
    to: "XRP",
    buy_coef: 0.995,
    sell_coef: 1.015,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }, {
    from: "EUR",
    to: "LTC",
    buy_coef: 0.995,
    sell_coef: 1.015,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }, {
    from: "EUR",
    to: "BCH",
    buy_coef: 0.995,
    sell_coef: 1.015,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }, {
    from: "EUR",
    to: "DASH",
    buy_coef: 0.995,
    sell_coef: 1.015,
    maximum_price_change_percent: 5,
    maximum_balance_used: 60
  }
];

const tradeEngine = new TradeEngine(devises, configs, tickHolder, ordersHolders);

const watch: Devise[] = [ "ETH", "XRP", "BTC", "LTC", "BCH", "DASH" ];

[
  ...watch.map(crypto => (["EUR", crypto]) as [Devise, Devise]),
  ...watch.map(crypto => (["USD", crypto]) as [Devise, Devise]),
]
.forEach(tuple => tickHolder.register(tuple[0], tuple[1]));


tickHolder.start()
.then(() => {
  console.log("trade engine starting...");
  tradeEngine.start();
})
.catch(err => console.log(err));