import { DeviseNames } from '.';
export type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;
export type Devise = ElementType<typeof DeviseNames>;
