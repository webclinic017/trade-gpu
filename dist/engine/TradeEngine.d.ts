import TickHolder from './TickHolder';
import Orders from './orders';
import Wallet from '../database/models/wallet';
import { Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import InternalTradeEngine, { DeviseConfig, TradeConfig } from './InternalTradeEngine';
import WalletAggregated from '../database/models/wallet_aggregation';
export { DeviseConfig, TradeConfig } from './InternalTradeEngine';
export default class TradeEngine extends InternalTradeEngine {
    private started;
    private aggregator;
    private manageBuy;
    private manageSell;
    constructor(devises: Map<Devise, DeviseConfig>, configs: TradeConfig[], exchange: AbstractExchange, tickHolder: TickHolder, ordersHolders: Orders);
    start(): void;
    private fullfillOrder;
    private manageBuyingOrder;
    private manageSellingOrder;
    wallets(from?: Date, to?: Date, raw?: boolean): Promise<Wallet[]>;
    walletsRaw(from?: Date, to?: Date): Promise<import("../database/models/wallet").WalletRaw[]>;
    walletAggregated(from?: Date, to?: Date): Promise<WalletAggregated[]>;
    private manageWallets;
    private afterTickStarted;
}
