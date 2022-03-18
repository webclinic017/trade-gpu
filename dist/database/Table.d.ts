import { Column } from './Column';
export interface ColumnOperator {
    column: string;
    operator: '=' | '<' | '>' | '<=' | '>=';
}
export declare class Table {
    name: string;
    private columns;
    constructor(name: string);
    add(column: Column): void;
    last(options?: string[], column?: string): string;
    first(options?: string[], column?: string): string;
    list(options?: ColumnOperator[]): string;
    str(): string;
    indexes(): string[];
}
