import moment from 'moment';
import { Runner } from '../runner';
import Wallet from '../database/models/wallet';

interface DayInfo {
  expectedMax: number;
  currentMax: number;
  expectedMin: number;
  currentMin: number;
  expectedAvg: number;
  currentAvg: number;
  cardinal: number;
}

function create(): DayInfo {
  return {
    expectedMax: 0,
    currentMax: 0,
    expectedMin: 0,
    currentMin: 0,
    expectedAvg: 0,
    currentAvg: 0,
    cardinal: 0,
  };
}

interface DayInfoDevise {
  [devise: string]: DayInfo[];
}

function getOrCreate(
  devise: string,
  dayInfos: DayInfoDevise,
  day: number,
  days: number,
): DayInfo {
  if (dayInfos[devise]) return dayInfos[devise][day];

  const array: DayInfo[] = [];
  dayInfos[devise] = array;
  for (let i = 0; i < days; i++) array.push(create());
  return array[day];
}

export default class WalletAggregation {
  private dayInfos: DayInfoDevise = {};

  public constructor(
    private exchange: string,
    private month: number,
    private year: number,
  ) {}

  public async load(runner: Runner) {
    // artifically create the expected number of info to fetch
    const date = moment()
      .set('year', this.year)
      .set('day', 1)
      .set('month', this.month);
    const startOf = date.startOf('month');
    const endOf = date.clone().endOf('month');
    const days = startOf.daysInMonth();

    const wallets = await runner.wallets(startOf.toDate(), endOf.toDate());

    wallets.forEach(({
      expectedAmount, currentAmount, timestamp, devise,
    }) => {
      const date = moment(Number.parseInt(timestamp.toFixed()));
      if (date.get('month') !== this.month || date.get('year') !== this.year) return;

      const day = date.day() - 1;
      const holder = getOrCreate(devise, this.dayInfos, day, days);

      if (expectedAmount.isLessThan(holder.expectedMin)) holder.expectedMin = expectedAmount.toNumber();
      if (currentAmount.isLessThan(holder.currentMin)) holder.currentMin = currentAmount.toNumber();
      if (expectedAmount.isGreaterThan(holder.expectedMax)) holder.expectedMax = expectedAmount.toNumber();
      if (currentAmount.isLessThan(holder.currentMax)) holder.currentMax = currentAmount.toNumber();
      holder.expectedAvg += expectedAmount.toNumber();
      holder.currentAvg += currentAmount.toNumber();
      holder.cardinal++;
      holder.expectedAvg /= holder.cardinal;
      holder.currentAvg /= holder.cardinal;
    });
  }

  json() {
    return {
      exchange: this.exchange,
      month: this.month,
      year: this.year,
      info: this.dayInfos,
    };
  }
}
