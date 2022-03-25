"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
let result = dotenv_1.default.config();
if (process.env.CONFIG_PATH) {
    result = dotenv_1.default.config({ path: process.env.CONFIG_PATH });
}
const json = {
    key: process.env.SERVER_KEY,
    cert: process.env.SERVER_CERT,
    https: process.env.HTTPS !== 'false',
    port: parseInt(process.env.SERVER_PORT || '443'),
};
if (Number.isNaN(json.port))
    json.port = 443;
exports.default = json;
//# sourceMappingURL=server.js.map