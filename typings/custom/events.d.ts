declare module 'events' {
  import * as events from 'events'

  export class Domain extends events.EventEmitter implements NodeJS.Domain {
    public members: any[]
    public run(fn: Function): void
    public add(emitter: events.EventEmitter): void
    public remove(emitter: events.EventEmitter): void
    public bind(cb: (err: Error, data: any) => any): any
    public intercept(cb: (data: any) => any): any
    public dispose(): void
    public enter(): void
    public exit(): void
  }

  export function create(): Domain
}
