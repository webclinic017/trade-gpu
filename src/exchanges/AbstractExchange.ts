import {
  AccountBalance,
  CurrencyLimit,
  Devise,
  OrderType,
  ShortOrder,
  Ticker,
} from './defs';

export abstract class AbstractExchange {
  public abstract name(): string;

  public abstract currency_limits(): Promise<CurrencyLimit[]>;

  public abstract open_orders(): Promise<ShortOrder[]>;

  public abstract history_orders(): Promise<ShortOrder[]>;

  public abstract place_order(
    left: Devise,
    right: Devise,
    type: OrderType,
    amount: number,
    price: number,
  ): Promise<ShortOrder>;

  public abstract cancel_order(id: string): Promise<boolean>;

  public abstract account_balance(): Promise<AccountBalance>;

  public abstract ticker(left: Devise, right: Devise): Promise<Ticker>;
}
