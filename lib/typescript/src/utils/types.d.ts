export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type PickPartial<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;
//# sourceMappingURL=types.d.ts.map