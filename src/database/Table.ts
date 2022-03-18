import { Column } from './Column';

export interface ColumnOperator {
  column: string;
  operator: '=' | '<' | '>' | '<=' | '>=';
}

export class Table {
  name: string;

  private columns: Column[] = [];

  constructor(name: string) {
    this.name = name;
  }

  public add(column: Column) {
    this.columns.push(column);
  }

  public last(options?: string[], column?: string) {
    if (!column) column = 'id';
    const columns = this.columns.map((c) => c.name).join(',');
    if (options && options.length > 0) {
      const whereColumns = options.map((c) => `${c}=?`).join(' AND ');
      return `SELECT ${columns} FROM ${this.name} WHERE ${whereColumns} ORDER BY ${column} DESC LIMIT 1`;
    }

    return `SELECT ${columns} FROM ${this.name} ORDER BY ${column} DESC LIMIT 1`;
  }

  public first(options?: string[], column?: string) {
    if (!column) column = 'id';
    const columns = this.columns.map((c) => c.name).join(',');
    if (options && options.length > 0) {
      const whereColumns = options.map((c) => `${c}=?`).join(' AND ');
      return `SELECT ${columns} FROM ${this.name} WHERE ${whereColumns} ORDER BY ${column} ASC LIMIT 1`;
    }

    return `SELECT ${columns} FROM ${this.name} ORDER BY ${column} ASC LIMIT 1`;
  }

  public list(options?: ColumnOperator[]) {
    const columns = this.columns.map((c) => c.name).join(',');
    if (options && options.length > 0) {
      const whereColumns = options
        .map((c) => `${c.column}${c.operator}?`)
        .join(' AND ');
      return `SELECT ${columns} FROM ${this.name} WHERE ${whereColumns} ORDER BY id`;
    }

    return `SELECT ${columns} FROM ${this.name} ORDER BY id`;
  }

  public str() {
    let text = `CREATE TABLE IF NOT EXISTS ${this.name} (`;
    text += this.columns.map((c) => c.str()).join(',');
    text += ')';
    return text;
  }

  public indexes() {
    return this.columns
      .filter((c) => c.index)
      .map(
        (c) => `CREATE INDEX IF NOT EXISTS idx_${this.name}_${c.name} ON ${this.name}(${c.name})`,
      );
  }
}
