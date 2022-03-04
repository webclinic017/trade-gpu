import { Database } from '../database';
import Order from '../database/models/order';
import { AbstractExchange } from '../exchanges/AbstractExchange';
import { Devise } from '../exchanges/defs';
export default class Orders {
    private exchange;
    private database;
    private loaded;
    private orders;
    constructor(exchange: AbstractExchange, database: Database);
    list(from: Devise, to: Devise): Promise<Order[]>;
    private internalList;
}
