import { OrderTable } from '../database/models/order';
import Ticks, { TickTable } from '../database/models/ticks';
import { Database } from '../database';
import { Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';

type Resolve<TYPE> = (res: TYPE) => void;
type Reject = () => void;

interface Pair {
  from: Devise;
  to: Devise;
}

interface TickerCall {
  pair: Pair;
  callback: () => Promise<void>;
}

export default class TickHolder {
  private resolve?: (b: boolean) => void;

  private db: Database;

  private pairs: Pair[] = [];

  private array: TickerCall[] = [];

  constructor(private exchange: AbstractExchange) {
    this.db = new Database('trading');
    this.db.add(TickTable);
    this.db.add(OrderTable);
  }

  private log(text: string, arg?: any) {
    if (arguments.length > 1) console.log(`${this.exchange.name()} ${text}`, arg);
    else console.log(`${this.exchange.name()} ${text}`);
  }

  public register(from: Devise, to: Devise) {
    if (!this.pairs.find((t) => t.from === from && t.to === to)) {
      this.log('registering tickers for ', { from, to });
      this.pairs.push({ from, to });
    }
  }

  public database() {
    return this.db;
  }

  public start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.callback();
    });
  }

  private callback = () => {
    Promise.all(this.pairs.map((pair) => this.tick(pair)))
      .then(() => {
        this.post();
        if (this.resolve) this.resolve(true);
      })
      .catch((err) => {
        this.post();
      });
  };

  private next() {
    if (this.array.length > 0) {
      const tickCall = this.array[0];
      tickCall.callback().then(() => {
        this.array.splice(0, 1);
        setTimeout(() => this.next(), 1);
      });
    }
  }

  private tick(pair: Pair): Promise<boolean> {
    return new Promise((resolve: Resolve<boolean>, reject: Reject) => {
      const callback: () => Promise<void> = () => new Promise((resolveForNext: Resolve<void>) => {
        this.exchange
          .ticker(pair.to, pair.from)
          .then((ticker) => {
            const object = Ticks.from(ticker, this.exchange.name());
            object.log(false);
            return object.save(this.database());
          })
          .then(() => {
            resolveForNext();
            resolve(true);
          })
          .catch((err) => {
            resolveForNext();
            resolve(false);
          });
      });

      const tickerCall = { pair, callback };
      this.array.push(tickerCall);

      if (this.array.length === 1) {
        this.next();
      }
    });
  }

  private post() {
    setTimeout(() => this.callback(), 60000);
  }
}
