import cex from "../config/cex";
import CEX from 'cexio-api-node';
import BigNumber from "bignumber.js";

export type OrderType = "buy"|"sell";
export type Devise = "EUR"
| "USD"
| "BTC"
| "ETH"
| "XRP"
| "LTC";

export interface AccountBalance {
  timestamp: number,
  ETH: { available: BigNumber, orders: BigNumber },
  USD: { available: BigNumber, orders: BigNumber },
  BTC: { available: BigNumber, orders: BigNumber },
  EUR: { available: BigNumber, orders: BigNumber }
}

export interface ShortOrder {
  id: string,
  time: number,
  type: OrderType,
  price: BigNumber,
  amount: BigNumber,
  pending: BigNumber | null,
  symbol1: Devise,
  symbol2: Devise
}

export interface Ticker {
  timestamp: BigNumber,
  low: BigNumber,
  high: BigNumber,
  last: BigNumber,
  volume: BigNumber,
  volume30d: BigNumber,
  bid: number,
  ask: number,
  priceChange: BigNumber,
  priceChangePercentage: BigNumber,
  pair: string
}

export default class Cex {

  public static instance = new Cex();
  cexAuth: any;
  private constructor() {
    this.cexAuth = new CEX(cex.clientId, cex.api, cex.secret).promiseRest;
  }

  asBigNumber(str: string): BigNumber {
    return new BigNumber(str || "0");
  }

  setAvailableOrders(objIn: any, objOut: any): void {
    Object.keys(objIn).forEach(key => {
      const value = objIn[key];
      if(value && value.available && value.orders) {
        objOut[key] = {
          available: new BigNumber(value.available),
          orders: new BigNumber(value.orders) 
        }
      }
    })
  }

  private toShortOrder(raw: any): ShortOrder {
    const obj: any = {};
    ["id", "type", "symbol1", "symbol2"].forEach(k => obj[k] = raw[k]);
    ["time"].forEach(k => obj[k] = parseInt(raw[k] || 0));
    ["price","amount","pending"].forEach(k => obj[k] = new BigNumber(raw[k]));
    return obj;
  }

  private wrap<TYPE>(promise:Promise<TYPE>): Promise<TYPE> {
    return new Promise((resolve, reject) => {
      promise.then(d => setTimeout(() => resolve(d), 1500))
      .catch(err => setTimeout(() => reject(err), 1500));
    })
  }

  open_orders = async (): Promise<ShortOrder[]> => {
    const result: any[] = await this.wrap(this.cexAuth.open_orders(null));
    if(result && result.length > 0) return result.map(o => this.toShortOrder(o));
    return [];
  }

  place_order = async (left: Devise, right: Devise, type: OrderType, amount: number, price: number): Promise<ShortOrder> => {
    const order = await this.wrap(this.cexAuth.place_order(left+"/"+right, type, amount, price, null));
    return this.toShortOrder(order);
  }

  cancel_order = async (id: string): Promise<boolean> => {
    return !!(await this.wrap(this.cexAuth.cancel_order(id)));
  }

  account_balance = async (): Promise<AccountBalance> => {
    const result: any = await this.wrap(this.cexAuth.account_balance());
    var object: AccountBalance = {
      timestamp: parseInt(result.timestamp),
      ETH: { available: new BigNumber(0), orders: new BigNumber(0) },
      EUR: { available: new BigNumber(0), orders: new BigNumber(0) },
      USD: { available: new BigNumber(0), orders: new BigNumber(0) },
      BTC: { available: new BigNumber(0), orders: new BigNumber(0) }
    };

    this.setAvailableOrders(result, object);
    return object;
  }

  ticker = async (left: Devise, right: Devise): Promise<Ticker> => {
    const result: any = await this.wrap(this.cexAuth.ticker(left+"/"+right));
    const obj: any = { pair: result.pair };
    ["timestamp", "low", "high", "last", "volume",
      "volume30d", "bid", "ask", "priceChange",
      "priceChangePercentage"].forEach(k => obj[k] = new BigNumber(result[k]));

    return obj;    
  }
}