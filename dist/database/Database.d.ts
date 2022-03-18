import sqlite3 from 'sqlite3';
import { Table } from './Table';
import Model from './models/model';
export interface WhereTuple {
    column: string;
    operator: '=' | '<' | '>' | '<=' | '>=';
    value: any;
}
export declare class Database {
    name: string;
    database: sqlite3.Database;
    constructor(name: string);
    save(name: string, pairs: [string, any, boolean?][], log: boolean, onId?: (id: number) => void, id?: number): void;
    list<TYPE>(table: Table, create: (row: any) => TYPE, where?: WhereTuple[]): Promise<TYPE[]>;
    lastWhere<TYPE extends Model>(table: Table, columns: string[], values: any[], create: (r: any) => TYPE): Promise<TYPE>;
    firstWhere<TYPE extends Model>(table: Table, columns: string[], values: any[], create: (r: any) => TYPE): Promise<TYPE>;
    private executeWhere;
    last<TYPE extends Model>(table: Table, create: (r: any) => TYPE, column?: string, columns?: string[], values?: string[]): Promise<TYPE | null>;
    add(table: Table): Promise<void>;
}
