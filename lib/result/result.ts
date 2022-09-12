type Success<T extends NonNullable<unknown>> = [true, T];
type Failure<E extends Error> = [false, E];
export type Result<T extends NonNullable<unknown>, E extends Error> = Success<T> | Failure<E>;

export const wrapResult = <T extends NonNullable<unknown>>(func: () => T): T | Error => {
  try {
    return func();
  } catch (error) {
    return error instanceof Error ? error : new Error("wrap failure", { cause: error });
  }
};

export const isSuccess = <T extends NonNullable<unknown>>(value: T | Error): value is Exclude<T, Error> => {
  return !(value instanceof Error);
};
