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
exports.Server = void 0;
const https_1 = __importDefault(require("https"));
const express_1 = __importDefault(require("express"));
class Server {
    constructor(runner) {
        this.runner = runner;
        this.app = express_1.default();
        this.server = https_1.default.createServer(this.app);
        this.app.get("/orders", (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const orders = runner.orders();
                res.json(orders);
            }
            catch (err) {
                res.status(500).json({ err: `${err}` });
            }
        }));
    }
    start() {
        this.server.listen(443, () => console.log("listening on port 443"));
    }
}
exports.Server = Server;
//# sourceMappingURL=index.js.map