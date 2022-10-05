declare const nominal: unique symbol;

export type Nominal<Type, Identifier extends string> = string extends Identifier
  ? "Identifier needs string literal type"
  : Type & {
      readonly [nominal]: Identifier;
    };
