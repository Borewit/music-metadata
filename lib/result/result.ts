export type Result<T extends NonNullable<unknown>, E extends Error> = T | E;

export const wrapResult = <T extends NonNullable<unknown>>(func: () => T): Result<T, Error> => {
  try {
    return func();
  } catch (error) {
    return error instanceof Error ? error : new Error("wrap failure", { cause: error });
  }
};

export const isSuccess = <T extends NonNullable<unknown>>(value: Result<T, Error>): value is Exclude<T, Error> => {
  return !(value instanceof Error);
};
