import { BigNumber } from 'bignumber.js';
import Tick from '../../database/models/ticks';
import { CurrencyLimit } from '../../exchanges/defs/CurrencyLimit';
import { TradeConfig } from '../InternalTradeEngine';
import ManageAbstract from './abstract';
interface ManageBuyConfig {
    tick: Tick;
    price: BigNumber;
    fromBalance: BigNumber;
}
export default class ManageBuy extends ManageAbstract<ManageBuyConfig> {
    manage(config: TradeConfig, configuration: CurrencyLimit, { tick, price, fromBalance }: ManageBuyConfig): Promise<boolean>;
}
export {};
