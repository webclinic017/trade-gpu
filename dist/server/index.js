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
const fs_1 = __importDefault(require("fs"));
const dgram_1 = __importDefault(require("dgram"));
const server_1 = __importDefault(require("../config/server"));
class Server {
    constructor(runner) {
        this.runner = runner;
        this.app = express_1.default();
        this.key = server_1.default.key ? fs_1.default.readFileSync(server_1.default.key) : undefined;
        this.cert = server_1.default.cert ? fs_1.default.readFileSync(server_1.default.cert) : undefined;
        this.server = https_1.default.createServer({ key: this.key, cert: this.cert }, this.app);
        this.app.get('/orders', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const orders = yield runner.orders();
                res.json(orders.map(({ from, to, orders }) => ({
                    from,
                    to,
                    orders: orders.map((o) => o.json()),
                })));
            }
            catch (err) {
                res.status(500).json({ err: `${err}` });
            }
        }));
        this.app.get('/wallets/:from/:to', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                var from = Number.parseInt((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.from);
                var to = Number.parseInt((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b.to);
                if (!from || Number.isNaN(from))
                    from = 0;
                if (!to || Number.isNaN(to))
                    to = 0;
                const wallets = yield runner.wallets(new Date(from), new Date(to));
                res.json(wallets.map((w) => w.json()));
            }
            catch (err) {
                res.status(500).json({ err: `${err}` });
            }
        }));
        this.datagram_server = dgram_1.default.createSocket('udp4');
        this.datagram_server.on('message', (message, rinfo) => {
            var _a;
            try {
                const json = JSON.parse(message);
                if (json.discover) {
                    const answer = {
                        service: 'trader',
                        data: {
                            port: server_1.default.port,
                            cert: (_a = this.cert) === null || _a === void 0 ? void 0 : _a.toString(),
                        },
                    };
                    const message = Buffer.from(JSON.stringify(answer));
                    console.log(`send replay to ${rinfo.address} ${rinfo.port}`);
                    this.datagram_server.send(message, 0, message.length, rinfo.port, rinfo.address);
                }
            }
            catch (e) {
                console.log(e);
            }
        });
        this.datagram_server.on('listening', () => {
            const address = this.datagram_server.address();
            console.log(`server listening ${address.address}:${address.port}`);
        });
    }
    start() {
        this.server.listen(server_1.default.port, () => console.log(`listening on port ${server_1.default.port}`));
        this.datagram_server.bind(1732);
    }
}
exports.Server = Server;
//# sourceMappingURL=index.js.map