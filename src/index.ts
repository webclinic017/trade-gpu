import cex from './exchanges/cex';
import { Runner } from './runner';
import { Server } from './server';

const runner = new Runner(cex);
const server = new Server(runner);

runner.start();
server.start();
