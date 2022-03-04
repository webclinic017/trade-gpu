import { Database } from '../database';
import { Devise } from '../exchanges/defs';
import { AbstractExchange } from '../exchanges/AbstractExchange';
export default class TickHolder {
    private exchange;
    private resolve?;
    private db;
    private pairs;
    private array;
    constructor(exchange: AbstractExchange);
    private log;
    register(from: Devise, to: Devise): void;
    database(): Database;
    start(): Promise<boolean>;
    private callback;
    private next;
    private tick;
    private post;
}
