import { AccountBalance, CurrencyLimit, Devise, OrderType, ShortOrder, Ticker } from './defs';
export declare abstract class AbstractExchange {
    abstract name(): string;
    abstract currency_limits(): Promise<CurrencyLimit[]>;
    abstract open_orders(): Promise<ShortOrder[]>;
    abstract history_orders(left: Devise, right: Devise): Promise<ShortOrder[]>;
    abstract place_order(left: Devise, right: Devise, type: OrderType, amount: number, price: number): Promise<ShortOrder>;
    abstract cancel_order(id: string): Promise<boolean>;
    abstract account_balance(): Promise<AccountBalance>;
    abstract ticker(left: Devise, right: Devise): Promise<Ticker>;
}
