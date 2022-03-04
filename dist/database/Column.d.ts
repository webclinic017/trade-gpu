import { Options } from './Options';
export declare class Column {
    name: string;
    type: string;
    nullable: boolean;
    index: boolean;
    increment: boolean;
    constructor(name: string, type: string, options?: Options);
    str(): string;
}
