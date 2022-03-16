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
  if (dayInfos[devise] && dayInfos[devise][day]) return dayInfos[devise][day];

  const array: DayInfo[] = [];
  dayInfos[devise] = array;
  for (let i = 0; i < days; i++) array.push(create());
  const result = array[day];
  if (!result) throw `${day} is out of range from ${days}`;
  return result;
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

    const wallets = await runner.walletsRaw(startOf.toDate(), endOf.toDate());

    wallets.forEach(
      ({
        // eslint-disable-next-line camelcase
        expected_amount,
        // eslint-disable-next-line camelcase
        current_amount,
        timestamp,
        devise,
      }) => {
        const date = moment(Number.parseInt(timestamp.toFixed()));
        if (date.get('month') !== this.month || date.get('year') !== this.year) return;

        const day = date.date() - 1;
        const holder = getOrCreate(devise, this.dayInfos, day, days);
        const expectedTransformed = Number.parseInt(expected_amount);
        const currentTransformed = Number.parseInt(current_amount);

        if (expectedTransformed < holder.expectedMin) holder.expectedMin = expectedTransformed;
        if (currentTransformed < holder.currentMin) holder.currentMin = currentTransformed;
        if (expectedTransformed > holder.expectedMax) holder.expectedMax = expectedTransformed;
        if (currentTransformed > holder.currentMax) holder.currentMax = currentTransformed;
        holder.expectedAvg += expectedTransformed;
        holder.currentAvg += currentTransformed;
        holder.cardinal++;
        holder.expectedAvg /= holder.cardinal;
        holder.currentAvg /= holder.cardinal;
      },
    );
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
