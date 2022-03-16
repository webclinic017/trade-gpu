"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
function create() {
    return {
        expectedMax: 0,
        currentMax: 0,
        expectedMin: Number.MAX_VALUE,
        currentMin: Number.MAX_VALUE,
        expectedAvg: 0,
        currentAvg: 0,
        cardinal: 0,
    };
}
function getOrCreate(devise, dayInfos, day, days) {
    if (dayInfos[devise] && dayInfos[devise][day])
        return dayInfos[devise][day];
    const array = [];
    dayInfos[devise] = array;
    for (let i = 0; i < days; i++)
        array.push(create());
    const result = array[day];
    if (!result)
        throw `${day} is out of range from ${days}`;
    return result;
}
class WalletAggregation {
    constructor(exchange, month, year) {
        this.exchange = exchange;
        this.month = month;
        this.year = year;
        this.dayInfos = {};
    }
    load(runner) {
        return __awaiter(this, void 0, void 0, function* () {
            // artifically create the expected number of info to fetch
            const date = moment_1.default()
                .set('year', this.year)
                .set('day', 1)
                .set('month', this.month);
            const startOf = date.startOf('month');
            const endOf = date.clone().endOf('month');
            const days = startOf.daysInMonth();
            const wallets = yield runner.walletsRaw(startOf.toDate(), endOf.toDate());
            wallets.forEach(({ 
            // eslint-disable-next-line camelcase
            expected_amount, 
            // eslint-disable-next-line camelcase
            current_amount, timestamp, devise, }) => {
                const date = moment_1.default(Number.parseInt(timestamp.toFixed()));
                if (date.get('month') !== this.month || date.get('year') !== this.year)
                    return;
                const day = date.date() - 1;
                const holder = getOrCreate(devise, this.dayInfos, day, days);
                const expectedTransformed = Number.parseInt(expected_amount);
                const currentTransformed = Number.parseInt(current_amount);
                if (expectedTransformed < holder.expectedMin)
                    holder.expectedMin = expectedTransformed;
                if (currentTransformed < holder.currentMin)
                    holder.currentMin = currentTransformed;
                if (expectedTransformed > holder.expectedMax)
                    holder.expectedMax = expectedTransformed;
                if (currentTransformed > holder.currentMax)
                    holder.currentMax = currentTransformed;
                holder.expectedAvg += expectedTransformed;
                holder.currentAvg += currentTransformed;
                holder.cardinal++;
                holder.expectedAvg /= holder.cardinal;
                holder.currentAvg /= holder.cardinal;
            });
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
exports.default = WalletAggregation;
//# sourceMappingURL=WalletAggregation.js.map