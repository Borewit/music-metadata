export interface ITree { [name: string]: string | number | boolean | Uint8Array | ITree | ITree[]; }

export enum DataType { 'string' = 0, uint = 1, uid = 2, bool = 3, binary = 4, float = 5}

export type ValueType = string | number | Uint8Array | boolean | ITree | ITree[];

export interface IHeader {
  id: number;
  len: number;
}

export interface IEbmlElements {
  version?: number;
  readVersion?: number;
  maxIDWidth?: number;
  maxSizeWidth?: number;
  docType?: string;
  docTypeVersion?: number;
  docTypeReadVersion?: number;
}

export interface IElementType {
  readonly name: string;
  readonly value?: DataType;
  readonly container?: { [id: number]: IElementType; };
  readonly multiple?: boolean;
}

export interface IEbmlDoc {
  ebml: IEbmlElements
}
