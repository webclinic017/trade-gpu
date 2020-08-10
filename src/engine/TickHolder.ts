import { OrderTable } from '../database/models/order';
import Ticks, { TickTable } from '../database/models/ticks';
import Cex, { Devise } from "../cex/instance";
import { Database } from "../database";

type Resolve<TYPE> = (res: TYPE) => void;
type Reject = () => void

interface Pair {
  from: Devise,
  to: Devise
}

interface TickerCall {
  pair: Pair,
  callback: () => Promise<void>
}

export default class TickHolder {
  private resolve?: (b:boolean) => void;
  private _database: Database;
  private _pairs: Pair[] = [];
  private _array: TickerCall[] = []; 

  constructor() {
    this._database = new Database("trading");
    this._database.add(TickTable);
    this._database.add(OrderTable);
  }

  public register(from: Devise, to: Devise) {
    if(!this._pairs.find(t => t.from == from && t.to == to)) {
      console.log("registering tickers for ", {from, to});
      this._pairs.push({from, to});
    }
  }

  public database = () => this._database;

  public start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.callback();
    });
  }

  private callback = () => {
    Promise.all(this._pairs.map(pair => this.tick(pair)))
    .then(() => {
      this.post();
      if(this.resolve) this.resolve(true);
    })
    .catch(err => {
      this.post();
    });
  
  }

  private next() {
    if(this._array.length > 0) {
      const tickCall = this._array[0];
      tickCall.callback()
      .then(() => {
        this._array.splice(0, 1);
        setTimeout(() => this.next(), 1); 
      })
    }
  }

  private tick(pair: Pair): Promise<boolean> {
    return new Promise((resolve: Resolve<boolean>, reject: Reject) => {
      const callback: () => Promise<void> = () => {
        return new Promise((resolveForNext: Resolve<void>) => {
          Cex.instance.ticker(pair.to, pair.from)
          .then(ticker => {
            const object = Ticks.from(ticker);
            object.log(false);
            return object.save(this._database)
          })
          .then(() => {
            resolveForNext();
            resolve(true);
          })
          .catch(err => {
            resolveForNext();
            resolve(false);
          });
        })
      }

      const tickerCall = { pair, callback};
      this._array.push(tickerCall);

      if(this._array.length == 1) {
        this.next();
      }

    });
  }
  private post() {
    setTimeout(() => this.callback(), 60000);
  }

}
