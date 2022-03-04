import { Database } from '..';
export declare type ModelPairs = [string, boolean | string | number | Date | undefined, boolean?][];
export default abstract class Model {
    protected name: string;
    id?: number | undefined;
    private enabled;
    constructor(name: string, id?: number | undefined);
    log(enabled: boolean): void;
    pairs(): ModelPairs;
    protected setId(id: number): void;
    save(database: Database): Promise<Model>;
}
