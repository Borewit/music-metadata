export class Deferred<T> {
  public promise: Promise<T>;
  public resolve: (value: T) => void = () => null;
  public reject: (reason: any) => void = () => null;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}
