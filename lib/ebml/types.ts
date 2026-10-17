export type PrimitiveValue = string | number | boolean | Uint8Array;

export interface ITree {
  [name: string]: PrimitiveValue | ITree | (PrimitiveValue | ITree)[];
}

export const DataType = {
  string: 0,
  uint: 1,
  uid: 2,
  bool: 3,
  binary: 4,
  float: 5,
  int: 6
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export type ValueType = PrimitiveValue | ITree;

export interface IHeader {
  id: number;
  len: number;
}

export interface IEbmlElements {
  ebmlVersion?: number;
  ebmlReadVersion?: number;
  ebmlMaxIDWidth?: number;
  ebmlMaxSizeWidth?: number;
  docType?: string;
  docTypeVersion?: number;
  docTypeReadVersion?: number;
}

export interface IElementType {
  readonly name: string;
  readonly value?: DataType;
  readonly container?: { readonly [id: number]: IElementType };
  readonly multiple?: boolean;
}

export interface IEbmlDoc {
  ebml?: IEbmlElements;
}

/** Values reflect what was actually read: even required EBML elements can be absent or skipped. */
export type DecodedElement<S extends IElementType> = S extends {
  readonly container: infer C extends Readonly<Record<number, IElementType>>;
}
  ? {
      -readonly [E in C[keyof C & number] as E['name']]?: E extends { readonly multiple: true }
        ? DecodedElement<E>[]
        : DecodedElement<E>;
    }
  : S extends { readonly value: infer V extends DataType }
    ? V extends typeof DataType.string
      ? string
      : V extends typeof DataType.bool
        ? boolean
        : V extends typeof DataType.binary | typeof DataType.uid
          ? Uint8Array
          : number
    : ITree;

/** Per-visit context; the schema itself never gains IDs or parent links. */
export interface IElementContext extends IElementType {
  readonly id: number;
  readonly parent: IElementContext | undefined;
}

/** Discriminating by ID narrows the decoded value along with the element. */
export type ElementEvent<S extends IElementType> = S extends {
  readonly container: infer C extends Readonly<Record<number, IElementType>>;
}
  ? {
      [Id in keyof C & number]:
        | {
            id: Id;
            element: IElementContext;
            value: DecodedElement<C[Id]>;
            offset: number;
          }
        | ElementEvent<C[Id]>;
    }[keyof C & number]
  : never;
