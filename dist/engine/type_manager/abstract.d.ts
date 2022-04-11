import { Database } from './../../database/Database';
import { AbstractExchange } from '../../exchanges/AbstractExchange';
import { Devise } from '../../exchanges/defs';
import { CurrencyLimit } from './../../exchanges/defs/CurrencyLimit';
import { TradeConfig } from './../InternalTradeEngine';
import Orders from '../orders';
import { DeviseConfig } from '../TradeEngine';
export default abstract class ManageAbstract<PARAMETERS> {
    protected exchange: AbstractExchange;
    protected database: Database;
    protected devises: Map<Devise, DeviseConfig>;
    protected log: (text: string, value?: any) => void;
    protected ordersHolders: Orders;
    constructor(exchange: AbstractExchange, database: Database, devises: Map<Devise, DeviseConfig>, log: (text: string, value?: any) => void, ordersHolders: Orders);
    protected decimals(devise?: Devise): number;
    abstract manage(config: TradeConfig, configuration: CurrencyLimit, parameters: PARAMETERS): Promise<boolean>;
}
