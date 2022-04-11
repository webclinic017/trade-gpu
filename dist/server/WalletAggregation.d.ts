import { Runner } from '../runner';
interface DayInfo {
    expectedMax: number;
    currentMax: number;
    expectedMin: number;
    currentMin: number;
    expectedAvg: number;
    currentAvg: number;
    cardinal: number;
}
interface DayInfoDeviseRaw {
    [devise: string]: DayInfo[];
}
export default class WalletAggregation {
    private exchange;
    private month;
    private year;
    private dayInfos;
    private cached;
    constructor(exchange: string, month: number, year: number);
    load(runner: Runner): Promise<void>;
    private needLoad;
    private infoJson;
    json(): {
        exchange: string;
        month: number;
        year: number;
        info: DayInfoDeviseRaw;
    };
}
export {};
