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
const bignumber_js_1 = __importDefault(require("bignumber.js"));
class AccountStat {
    constructor(exchange, configs, ordersHolders) {
        this.exchange = exchange;
        this.configs = configs;
        this.ordersHolders = ordersHolders;
    }
    stats() {
        return __awaiter(this, void 0, void 0, function* () {
            const tuples = [];
            const values = [];
            const { balances } = yield this.exchange.account_balance();
            const wrapper = {};
            this.configs.forEach(({ from, to, balance_weight_used }) => {
                const holder = wrapper[from] || (() => {
                    return wrapper[from] = { to: [] };
                })();
                const values = holder.to;
                if (!values.find(v => v.devise == to))
                    values.push({ devise: to, weight: balance_weight_used });
            });
            const froms = Object.keys(wrapper);
            console.log("froms", froms);
            froms.forEach(from => {
                const totalHolder = values.find(v => v.devise == from) || (() => {
                    const holder = { devise: from, total: new bignumber_js_1.default(0), totalWeight: 0 };
                    values.push(holder);
                    return holder;
                })();
                const holder = wrapper[from];
                if (!holder)
                    return;
                const devises = holder.to;
                const all = [{ devise: from, weight: 0 }, ...devises];
                console.log(`information about ${from} :=`);
                all.forEach(({ devise, weight }) => {
                    const balance = balances[devise];
                    console.log(`  ${devise} => available : ${balance.available.toNumber()}`);
                    console.log(`  ${devise} => orders    : ${balance.orders.toNumber()}`);
                    const orders = this.ordersHolders.filter(from, devise);
                    const current = orders.filter(o => !o.completed).find(o => !!o);
                    if (!current)
                        return;
                    const expectedValue = current.price.multipliedBy(current.amount);
                    if (current.type == 'buy') {
                        console.log(`  ${devise} => buy    : ${expectedValue.toNumber()}`);
                    }
                    else {
                        console.log(`  ${devise} => sell   : ${expectedValue.toNumber()}`);
                    }
                    totalHolder.total = totalHolder.total.plus(expectedValue);
                    totalHolder.totalWeight += weight;
                    tuples.push({
                        from,
                        to: devise,
                        order: current,
                        solde: expectedValue,
                        weight
                    });
                });
            });
            return { values, tuples };
        });
    }
}
exports.default = AccountStat;
//# sourceMappingURL=AccountStat.js.map