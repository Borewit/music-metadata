declare module 'strtok2' {
  import ReadableStream = NodeJS.ReadableStream
  import EventEmitter = NodeJS.EventEmitter;

  type Value = any // ToDo

  type Flush = (b: Buffer, o: number) => void

  type Get = (buf: Buffer, off: number) => Value

  type Put = (b: Buffer, o: number, v: number, flush: Flush) => number

  type Callback = (v: Value, cb) => void

  // --- Sentinel types  ---
  export interface ISentinelType {
  }

  export let DEFER: ISentinelType

  export let DONE: ISentinelType

  export interface IPrimitiveType {
    len: number,
    get: Get,
    put: Put
  }

  // --- Primitive types ---
  export let UINT8: IPrimitiveType

  export let UINT16_LE: IPrimitiveType

  export let UINT32_LE: IPrimitiveType

  export let UINT32_BE: IPrimitiveType

  export let INT8: IPrimitiveType

  export let INT16_BE: IPrimitiveType

  export let INT32_BE: IPrimitiveType

  // --- Complex types ---
  //
  // These types are intended to allow callers to re-use them by manipulating
  // the 'len' and other properties directly

  export interface IComplexType {
    len: number,
    get: Get
  }

  export class IgnoreType implements IComplexType {
    len: number

    public get: Get

    constructor(len: number)
  }

  export class BufferType implements IComplexType {
    len: number

    get: Get

    constructor(len: number, encoding?: string)
  }

  export class StringType implements IComplexType {
    len: number

    public get: Get

    constructor(len: number, cb)
  }

  export type ParseType = IPrimitiveType | ISentinelType | IComplexType

  export function parse (stream: EventEmitter, cb: Callback): ParseType
}
