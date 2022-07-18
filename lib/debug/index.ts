/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */

export default (namespace: string) =>
  (...logArgs: Parameters<typeof console.debug>): void => {
    // eslint-disable-next-line no-console
    return void [namespace, logArgs];
    // console.debug(namespace, ...logArgs);
  };
