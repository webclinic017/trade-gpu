import { DeviseNames } from '.';
export declare type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;
export declare type Devise = ElementType<typeof DeviseNames>;
