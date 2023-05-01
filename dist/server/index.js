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
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const dgram_1 = __importDefault(require("dgram"));
const moment_1 = __importDefault(require("moment"));
const server_1 = __importDefault(require("../config/server"));
const WalletAggregation_1 = __importDefault(require("./WalletAggregation"));
function getOrSet(data, exchange, month, year) {
    if (!data[exchange])
        data[exchange] = {};
    const holder = data[exchange];
    if (!holder[year])
        holder[year] = {};
    if (!holder[year][month])
        holder[year][month] = new WalletAggregation_1.default(exchange, month, year);
    return holder[year][month];
}
class Server {
    constructor(runner) {
        this.runner = runner;
        this.data = {};
        this.app = (0, express_1.default)();
        this.key = server_1.default.key ? fs_1.default.readFileSync(server_1.default.key) : undefined;
        this.cert = server_1.default.cert ? fs_1.default.readFileSync(server_1.default.cert) : undefined;
        if (!!server_1.default.https) {
            this.server = https_1.default.createServer({ key: this.key, cert: this.cert }, this.app);
        }
        else {
            this.server = http_1.default.createServer(this.app);
        }
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
        this.app.get('/wallets/:month/:year', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const month = Number.parseInt((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.month) - 1;
                const year = Number.parseInt((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b.year);
                const currentYear = (0, moment_1.default)().year();
                if (month < 0 || month > 11)
                    throw `invalid month : ${month}`;
                if (Math.abs(year - currentYear) > 10)
                    throw `invalid year : ${year}`;
                const aggregat = getOrSet(this.data, runner.exchange(), month, year);
                yield aggregat.load(runner);
                res.json(aggregat.json());
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