import { BigNumber } from 'bignumber.js';
import { TradeConfig } from './../InternalTradeEngine';
import { CurrencyLimit } from './../../exchanges/defs/CurrencyLimit';
import Order from '../../database/models/order';
import ManageAbstract from './abstract';
export interface ManageSellConfig {
    toBalance: BigNumber;
    priceToSellCurrentTick: BigNumber;
    orders: Order[];
    lastBuyComplete?: Order | null;
}
export default class ManageSell extends ManageAbstract<ManageSellConfig> {
    manage(config: TradeConfig, configuration: CurrencyLimit, { toBalance, priceToSellCurrentTick, orders, lastBuyComplete, }: ManageSellConfig): Promise<boolean>;
}
