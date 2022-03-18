import BigNumber from 'bignumber.js';
import moment, { Moment } from 'moment';
import { Database } from '../database';
import Wallet from '../database/models/wallet';
import WalletAggregated from '../database/models/wallet_aggregation';

interface WalletDevise {
  [devise: string]: Wallet[];
}

function pushInto(walletDevise: WalletDevise, wallet: Wallet) {
  const { devise } = wallet;
  if (!walletDevise[devise]) {
    walletDevise[devise] = [];
  }
  walletDevise[devise].push(wallet);
}

export default class WalletAggregatorClass {
  private started: boolean = false;

  private aggregating = false;

  constructor(private database: Database, private exchange: string) {}

  public start() {
    if (this.started) return;
    this.started = true;

    setInterval(() => {
      this.startAggregation();
    }, 10 * 60000);
    this.startAggregation();
  }

  private async startAggregation() {
    if (this.aggregating) return;
    this.aggregating = true;

    try {
      const last = await WalletAggregated.last(this.database, this.exchange);
      const barrier = moment()
        .startOf('hour')
        .add(-30, 'minutes')
        .endOf('hour');

      const lastDate = last ? moment(last.start.toNumber()) : undefined;
      let lastWalletDate: Moment | undefined;

      if (!lastDate) {
        const wallet = await Wallet.first(this.database, this.exchange);

        if (!wallet) {
          throw 'no wallet saved, cancelling creation';
        }

        lastWalletDate = moment(wallet.timestamp.toNumber()).startOf('hour');
      }

      if (!lastWalletDate && !lastDate) throw 'invalid case';

      let start = lastWalletDate
        ? lastWalletDate.startOf('hour')
        : lastDate?.clone().add(30, 'minutes').startOf('hour');
      if (!start) throw 'invalid start';
      let end = start.clone().endOf('hour');

      while (start && end.isBefore(barrier)) {
        const holder: WalletDevise = {};

        console.log(`${start}/${end} is before ${barrier}`);

        const wallets = await Wallet.list(
          this.database,
          this.exchange,
          start.toDate(),
          end.toDate(),
        );
        wallets.forEach((w) => pushInto(holder, w));

        const startOf = start;
        const endOf = end;
        const toSave: WalletAggregated[] = [];
        Object.keys(holder).forEach((key) => {
          if (!startOf) return;
          const wallets = holder[key];
          console.log(`found ${wallets.length} wallets item for this interval`);

          const currentArray = wallets.map((w) => w.currentAmount.toNumber());
          const expectedArray = wallets.map((w) => w.expectedAmount.toNumber());
          const currentMax = new BigNumber(Math.max(...currentArray));
          const expectedMax = new BigNumber(Math.max(...expectedArray));
          const currentMin = new BigNumber(Math.min(...currentArray));
          const expectedMin = new BigNumber(Math.min(...expectedArray));
          const currentSum = new BigNumber(
            currentArray.reduce((l, r) => l + r, 0) / currentArray.length,
          );
          const expectedSum = new BigNumber(
            expectedArray.reduce((l, r) => l + r, 0) / expectedArray.length,
          );

          const walletAggregated = new WalletAggregated(
            this.exchange,
            new BigNumber(startOf.unix() * 1000),
            new BigNumber(endOf.unix() * 1000),
            key,
            expectedMax,
            currentMax,
            expectedMin,
            currentMin,
            expectedSum,
            currentSum,
          );
          toSave.push(walletAggregated);
        });

        for (let i = 0; i < toSave.length; i++) {
          await toSave[i].save(this.database);
          console.log(`${toSave[i].id} saved`);
        }

        start = end.clone().add(30, 'minutes').startOf('hour');
        end = start.clone().endOf('hour');
      }
    } catch (e) {
      console.error(e);
    }
    this.aggregating = false;
  }
}
