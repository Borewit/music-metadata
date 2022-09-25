import type { Result } from "../type/result";

/**
 * catch and return a thrown error
 * @param fn function returns value or throws error
 * @returns value or error
 */
export const wrapError = <T, E extends Error>(fn: () => T): Result<T, E> => {
  try {
    return fn();
  } catch (error) {
    return error as E;
  }
};
