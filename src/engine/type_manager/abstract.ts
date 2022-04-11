import { Database } from '../../database/Database';
import { AbstractExchange } from '../../exchanges/AbstractExchange';
import { Devise } from '../../exchanges/defs';
import { CurrencyLimit } from '../../exchanges/defs/CurrencyLimit';
import { TradeConfig } from '../InternalTradeEngine';
import Orders from '../orders';
import { DeviseConfig } from '../TradeEngine';

export default abstract class ManageAbstract<PARAMETERS> {
  public constructor(
    protected exchange: AbstractExchange,
    protected database: Database,
    protected devises: Map<Devise, DeviseConfig>,
    protected log: (text: string, value?: any) => void,
    protected ordersHolders: Orders,
  ) {}

  protected decimals(devise?: Devise) {
    if (!devise) return 2;
    const object = this.devises.get(devise);
    if (!object) return 2;
    let { decimals } = object;
    if (decimals === null || undefined === decimals) decimals = 0;
    if (decimals < 0) decimals = 0;
    return decimals;
  }

  public abstract manage(
    config: TradeConfig,
    configuration: CurrencyLimit,
    parameters: PARAMETERS,
  ): Promise<boolean>;
}
