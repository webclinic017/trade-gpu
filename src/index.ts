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
  name: "ETH",
  decimals: 4
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
  }
];

const tradeEngine = new TradeEngine(devises, configs, tickHolder, ordersHolders);


const ticks: [Devise, Devise][] = [
  [ "EUR", "ETH" ],
  [ "EUR", "BTC" ],
  [ "USD", "ETH" ],
  [ "USD", "BTC" ]
];

ticks.forEach(tuple => tickHolder.register(tuple[0], tuple[1]));


tickHolder.start()
.then(() => {
  console.log("trade engine starting...");
  tradeEngine.start();
})
.catch(err => console.log(err));