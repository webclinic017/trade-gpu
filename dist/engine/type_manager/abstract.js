"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ManageAbstract {
    constructor(exchange, database, devises, log, ordersHolders) {
        this.exchange = exchange;
        this.database = database;
        this.devises = devises;
        this.log = log;
        this.ordersHolders = ordersHolders;
    }
    decimals(devise) {
        if (!devise)
            return 2;
        const object = this.devises.get(devise);
        if (!object)
            return 2;
        let { decimals } = object;
        if (decimals === null || undefined === decimals)
            decimals = 0;
        if (decimals < 0)
            decimals = 0;
        return decimals;
    }
}
exports.default = ManageAbstract;
//# sourceMappingURL=abstract.js.map