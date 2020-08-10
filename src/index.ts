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

const tradeConfig: TradeConfig = {
  from: "EUR",
  to: "ETH",
  buy_coef: 0.995,
  sell_coef: 1.015
};

const tradeEngine = new TradeEngine(devises, tradeConfig, tickHolder, ordersHolders);

tickHolder.register("EUR", "ETH");
tickHolder.register("EUR", "BTC");
tickHolder.register("USD", "ETH");
tickHolder.register("USD", "BTC");
tickHolder.start()
.then(() => {
  console.log("trade engine starting...");
  tradeEngine.start();
})
.catch(err => console.log(err));