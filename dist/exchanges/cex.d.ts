import { AbstractExchange } from './AbstractExchange';
import { AccountBalance, CurrencyLimit, Devise, OrderType, ShortOrder, Ticker } from './defs';
export declare class Cex extends AbstractExchange {
    private cexAuth;
    constructor();
    name(): string;
    private setAvailableOrders;
    private toShortOrder;
    private wrap;
    currency_limits(): Promise<CurrencyLimit[]>;
    history_orders(left: Devise, right: Devise): Promise<ShortOrder[]>;
    open_orders(): Promise<ShortOrder[]>;
    place_order(left: Devise, right: Devise, type: OrderType, amount: number, price: number): Promise<ShortOrder>;
    private place_order_check;
    cancel_order(id: string): Promise<boolean>;
    account_balance(): Promise<AccountBalance>;
    ticker(left: Devise, right: Devise): Promise<Ticker>;
}
declare const _default: Cex;
export default _default;
