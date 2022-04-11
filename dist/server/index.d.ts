import { Runner } from '../runner';
export declare class Server {
    private runner;
    private data;
    private server;
    private datagram_server;
    private app;
    private key?;
    private cert?;
    constructor(runner: Runner);
    start(): void;
}
