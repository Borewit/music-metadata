export type Result<T extends NonNullable<unknown>, E extends Error> = T | E;
