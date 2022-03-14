import { Runner } from "../runner";
export declare class Server {
    private runner;
    private server;
    private app;
    constructor(runner: Runner);
    start(): void;
}
