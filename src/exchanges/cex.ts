// @ts-ignore
import CEX from 'cexio-api-node';
import BigNumber from 'bignumber.js';
import cex from '../config/cex';
import { AbstractExchange } from './AbstractExchange';
import {
  AccountBalance,
  Balances,
  CurrencyLimit,
  Devise,
  DeviseNames,
  OrderType,
  ShortOrder,
  Ticker,
} from './defs';

interface CurrencyLimitAPI {
  symbol1: string;
  symbol2: string;
  pricePrecision: number;
  minLotSize: number;
  minLotSizeS2: number;
  minPrice: number;
  maxPrice: number;
}

function wait(time: number): Promise<void> {
  if (time <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    console.log(`waiting for ${time}ms`);
    setTimeout(() => resolve(), time);
  });
}

function toCurrencyLimit(object: CurrencyLimitAPI): CurrencyLimit {
  if (!object) throw `invalid object ${JSON.stringify(object)}`;
  if (!object) throw `invalid object ${JSON.stringify(object)}`;
  const {
    symbol1,
    symbol2,
    pricePrecision,
    minLotSize,
    minLotSizeS2,
    minPrice,
    maxPrice,
  } = object;
  return {
    from: symbol2,
    to: symbol1,
    pricePrecision: parseInt((<unknown>pricePrecision) as string),
    minimumSizeTo: new BigNumber(minLotSize),
    minimumSizeFrom: new BigNumber(minLotSizeS2),
    minPrice: new BigNumber(minPrice),
    maxPrice: new BigNumber(maxPrice),
  };
}

const RETRIES = 3;

export class Cex extends AbstractExchange {
  private cexAuth: any;

  public constructor() {
    super();

    this.cexAuth = new CEX(cex.clientId, cex.api, cex.secret).promiseRest;
  }

  public name() {
    return 'cex';
  }

  private setAvailableOrders(objIn: any, objOut: Balances): void {
    const keysInObjIn = Object.keys(objIn);

    DeviseNames.forEach((name) => {
      if (!keysInObjIn.includes(name)) {
        console.error(
          `Invalid name, not found in the keys: ${name}`,
          keysInObjIn,
        );
      }

      const value = objIn[name];
      if (value && value.available && value.orders) {
        objOut[name] = {
          available: new BigNumber(value.available),
          orders: new BigNumber(value.orders),
        };
      }
    });
  }

  private toShortOrder(raw: any): ShortOrder {
    const obj: any = {};
    ['id', 'type', 'symbol1', 'symbol2'].forEach((k) => (obj[k] = raw[k]));
    ['time'].forEach((k) => (obj[k] = parseInt(raw[k] || 0)));
    ['price', 'amount', 'pending'].forEach(
      (k) => (obj[k] = new BigNumber(raw[k])),
    );
    return obj;
  }

  private wrap<TYPE>(promise: Promise<TYPE>): Promise<TYPE> {
    return new Promise((resolve, reject) => {
      promise
        .then((d) => setTimeout(() => resolve(d), 1500))
        .catch((err) => setTimeout(() => reject(err), 1500));
    });
  }

  public async currency_limits(): Promise<CurrencyLimit[]> {
    const result: any = await this.wrap(this.cexAuth.currency_limits());

    if (!result || !result.pairs || result.pairs.length === 0) throw 'invalid configuration found for currency limits in CEX';
    return result.pairs.map((p: CurrencyLimitAPI) => toCurrencyLimit(p));
  }

  public async history_orders(
    left: Devise,
    right: Devise,
  ): Promise<ShortOrder[]> {
    const result: any[] = await this.wrap(
      this.cexAuth.archived_orders(`${left}/${right}`),
    );
    if (result && result.length > 0) return result.map((o) => this.toShortOrder(o));
    return [];
  }

  public async open_orders(): Promise<ShortOrder[]> {
    const result: any[] = await this.wrap(this.cexAuth.open_orders(null));
    if (result && result.length > 0) return result.map((o) => this.toShortOrder(o));
    return [];
  }

  public async place_order(
    left: Devise,
    right: Devise,
    type: OrderType,
    amount: number,
    price: number,
  ): Promise<ShortOrder> {
    // will try at most 3 times in case of connection reset
    return this.place_order_check(left, right, type, amount, price, RETRIES);
  }

  private async place_order_check(
    left: Devise,
    right: Devise,
    type: OrderType,
    amount: number,
    price: number,
    numberRetry: number,
  ): Promise<ShortOrder> {
    try {
      const order = await this.wrap(
        this.cexAuth.place_order(`${left}/${right}`, type, amount, price, null),
      );
      return this.toShortOrder(order);
    } catch (e) {
      const error = `${e}`;
      if (
        !numberRetry
        || numberRetry < 0
        || !(error.indexOf('ESOCKETTIMEDOUT') >= 0)
      ) throw e;
      const retries = numberRetry - 1;
      await wait((RETRIES - retries) * 1000);
      return this.place_order_check(left, right, type, amount, price, retries);
    }
  }

  public async cancel_order(id: string): Promise<boolean> {
    return !!(await this.wrap(this.cexAuth.cancel_order(id)));
  }

  public async account_balance(): Promise<AccountBalance> {
    const result: any = await this.wrap(this.cexAuth.account_balance());
    const object: AccountBalance = {
      timestamp: parseInt(result.timestamp),
      balances: {} as Balances,
    };

    // take every Devises
    DeviseNames.forEach((value) => {
      object.balances[value] = {
        available: new BigNumber(0),
        orders: new BigNumber(0),
      };
    });

    this.setAvailableOrders(result, object.balances);
    return object;
  }

  public async ticker(left: Devise, right: Devise): Promise<Ticker> {
    const result: any = await this.wrap(
      this.cexAuth.ticker(`${left}/${right}`),
    );

    if (
      typeof result === 'string'
      || `${result}`.indexOf('Invalid Symbols') >= 0
    ) {
      throw new Error(`${result}`);
    }

    const obj: any = { pair: result.pair };
    [
      'timestamp',
      'low',
      'high',
      'last',
      'volume',
      'volume30d',
      'bid',
      'ask',
      'priceChange',
      'priceChangePercentage',
    ].forEach((k) => {
      obj[k] = new BigNumber(result[k]);
    });

    return obj;
  }
}

export default new Cex();
