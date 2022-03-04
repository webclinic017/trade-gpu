"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = void 0;
class Column {
    constructor(name, type, options) {
        this.name = name;
        this.type = type;
        this.nullable = !!(options === null || options === void 0 ? void 0 : options.nullable);
        this.index = !!(options === null || options === void 0 ? void 0 : options.index);
        this.increment = !!(options === null || options === void 0 ? void 0 : options.increment);
    }
    str() {
        const nullable = this.nullable ? 'NULL' : 'NOT NULL';
        if (this.increment)
            return `${this.name} ${this.type} PRIMARY KEY AUTOINCREMENT`;
        return `${this.name} ${this.type} ${nullable}`;
    }
}
exports.Column = Column;
//# sourceMappingURL=Column.js.map