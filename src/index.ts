import cex from './exchanges/cex';
import { Runner } from './runner';

const runner = new Runner(cex);

runner.start();
