import { Column } from './Column';
export declare class Table {
    name: string;
    private columns;
    constructor(name: string);
    add(column: Column): void;
    last(options?: string[]): string;
    list(options?: string[]): string;
    str(): string;
    indexes(): string[];
}
