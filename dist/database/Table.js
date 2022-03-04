"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
class Table {
    constructor(name) {
        this.columns = [];
        this.name = name;
    }
    add(column) {
        this.columns.push(column);
    }
    last(options) {
        const columns = this.columns.map((c) => c.name).join(',');
        if (options && options.length > 0) {
            const whereColumns = options.map((c) => `${c}=?`).join(' AND ');
            return `SELECT ${columns} FROM ${this.name} WHERE ${whereColumns} ORDER BY id DESC LIMIT 1`;
        }
        return `SELECT ${columns} FROM ${this.name} ORDER BY id DESC LIMIT 1`;
    }
    list(options) {
        const columns = this.columns.map((c) => c.name).join(',');
        if (options && options.length > 0) {
            const whereColumns = options.map((c) => `${c}=?`).join(' AND ');
            return `SELECT ${columns} FROM ${this.name} WHERE ${whereColumns} ORDER BY id`;
        }
        return `SELECT ${columns} FROM ${this.name} ORDER BY id`;
    }
    str() {
        let text = `CREATE TABLE IF NOT EXISTS ${this.name} (`;
        text += this.columns.map((c) => c.str()).join(',');
        text += ')';
        return text;
    }
    indexes() {
        return this.columns
            .filter((c) => c.index)
            .map((c) => `CREATE INDEX IF NOT EXISTS idx_${this.name}_${c.name} ON ${this.name}(${c.name})`);
    }
}
exports.Table = Table;
//# sourceMappingURL=Table.js.map