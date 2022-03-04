"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cex_1 = __importDefault(require("./exchanges/cex"));
const runner_1 = require("./runner");
const runner = new runner_1.Runner(cex_1.default);
runner.start();
//# sourceMappingURL=index.js.map