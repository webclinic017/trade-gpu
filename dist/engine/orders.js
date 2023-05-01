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
const order_1 = __importDefault(require("../database/models/order"));
/*
order placed
{
  complete: false,
  id: '11587333881',
  time: 1580227252384,
  pending: '0.50000000',
  amount: '0.50000000',
  type: 'sell',
  price: '160.17'
}
*/
class Orders {
    constructor(exchange, database) {
        this.exchange = exchange;
        this.database = database;
        this.loaded = false;
        this.orders = [];
    }
    list(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const orders = yield this.filter(from, to);
                return { from, to, orders };
            }
            catch (err) {
                return { from, to, orders: [] };
            }
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!!this.loaded)
                return;
            const list = yield order_1.default.list(this.database, this.exchange.name());
            this.loaded = true;
            this.orders = list;
        });
    }
    fetch(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.filter(from, to);
            const shortOrders = yield this.exchange.open_orders();
            const obtainedOrders = shortOrders.map((o) => order_1.default.from(o, this.exchange.name()));
            const newOrders = obtainedOrders.filter((o) => !o.isIn(this.orders));
            const toSave = [];
            // check for orders to fix
            const toFix = [];
            shortOrders.forEach((order) => {
                const cache = this.orders.find((o) => o.txid.isEqualTo(order.id));
                if (!!cache && cache.completed) {
                    console.log('order to fix its completion status !');
                    toFix.push(cache);
                    cache.completed = false;
                }
            });
            // saving cached orders
            yield Promise.all(toFix.map((o) => o.save(this.database)));
            newOrders.forEach((o) => (o.completed = false));
            this.orders.forEach((o) => !o.completed && !o.isIn(obtainedOrders) && toSave.push(o));
            toSave.forEach((o) => (o.completed = true));
            toSave.length > 0
                && console.log('order finished !', toSave.map((o) => o.json()));
            newOrders.length > 0
                && console.log('order new !', newOrders.map((o) => o.json()));
            if (newOrders.length > 0) {
                yield Promise.all(toSave.map((o) => o.save(this.database)));
                const orders = yield Promise.all(newOrders.map((o) => o.save(this.database)));
                console.log('saved', orders.map((o) => o.json()));
                orders.forEach((o) => this.orders.push(o));
            }
            else {
                yield Promise.all(toSave.map((o) => o.save(this.database)));
            }
            return this.filter(from, to);
        });
    }
    filter(from, to) {
        if (this.loaded) {
            return this.orders.filter((order) => order.left === to && order.right === from);
        }
        // from = FIAT and to = CRYPTO for instance
        return this.orders.filter((order) => order.left === to && order.right === from);
    }
    ;
}
exports.default = Orders;
//# sourceMappingURL=orders.js.map