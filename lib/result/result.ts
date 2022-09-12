type Success<T extends NonNullable<unknown>> = [true, T];
type Failure<E extends Error> = [false, E];
export type Result<T extends NonNullable<unknown>, E extends Error> = Success<T> | Failure<E>;

export const wrapResult = <T extends NonNullable<unknown>>(func: () => T): Result<T, Error> => {
  try {
    return [true, func()];
  } catch (error) {
    return [false, error instanceof Error ? error : new Error("wrap failure", { cause: error })];
  }
};
