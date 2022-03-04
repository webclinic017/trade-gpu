"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
var result = dotenv_1.default.config();
if (process.env.CONFIG_PATH) {
    result = dotenv_1.default.config({ path: process.env.CONFIG_PATH });
}
const json = {
    clientId: process.env.CEX_CLIENT_ID,
    api: process.env.CEX_API,
    secret: process.env.CEX_SECRET,
};
exports.default = json;
//# sourceMappingURL=cex.js.map