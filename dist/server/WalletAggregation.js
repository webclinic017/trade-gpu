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
        expectedMin: 0,
        currentMin: 0,
        expectedAvg: 0,
        currentAvg: 0,
        cardinal: 0,
    };
}
function getOrCreate(devise, dayInfos, day, days) {
    if (dayInfos[devise])
        return dayInfos[devise][day];
    var array = [];
    dayInfos[devise] = array;
    for (var i = 0; i < days; i++)
        array.push(create());
    return array[day];
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
            //artifically create the expected number of info to fetch
            const date = moment_1.default()
                .set('year', this.year)
                .set('day', 1)
                .set('month', this.month);
            const startOf = date.startOf('month');
            const endOf = date.clone().endOf('month');
            const days = startOf.daysInMonth();
            const wallets = yield runner.wallets(startOf.toDate(), endOf.toDate());
            wallets.forEach(({ expectedAmount, currentAmount, timestamp, devise }) => {
                const date = moment_1.default(Number.parseInt(timestamp.toFixed()));
                if (date.get('month') !== this.month || date.get('year') !== this.year)
                    return;
                const day = date.day() - 1;
                const holder = getOrCreate(devise, this.dayInfos, day, days);
                if (expectedAmount.isLessThan(holder.expectedMin))
                    holder.expectedMin = expectedAmount.toNumber();
                if (currentAmount.isLessThan(holder.currentMin))
                    holder.currentMin = currentAmount.toNumber();
                if (expectedAmount.isGreaterThan(holder.expectedMax))
                    holder.expectedMax = expectedAmount.toNumber();
                if (currentAmount.isLessThan(holder.currentMax))
                    holder.currentMax = currentAmount.toNumber();
                holder.expectedAvg += expectedAmount.toNumber();
                holder.currentAvg += currentAmount.toNumber();
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