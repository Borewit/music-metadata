import { ITokenizer } from "strtok3/lib/core";
import initDebug from "debug";

import * as AtomToken from "./AtomToken";

export type AtomDataHandler = (atom: Atom, remaining: number) => Promise<void>;

const debug = initDebug("music-metadata:parser:MP4:Atom");

export class Atom {
  public static async readAtom(
    tokenizer: ITokenizer,
    dataHandler: AtomDataHandler,
    parent: Atom,
    remaining: number
  ): Promise<Atom> {
    // Parse atom header
    const offset = tokenizer.position;
    // debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
    const header = await tokenizer.readToken<AtomToken.IAtomHeader>(
      AtomToken.Header
    );
    const extended = header.length === BigInt(1);
    if (extended) {
      header.length = await tokenizer.readToken<bigint>(AtomToken.ExtendedSize);
    }
    const atomBean = new Atom(header, header.length === BigInt(1), parent);
    const payloadLength = atomBean.getPayloadLength(remaining);
    debug(
      `parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`
    ); //  buf.toString('ascii')
    await atomBean.readData(tokenizer, dataHandler, payloadLength);
    return atomBean;
  }

  public readonly children: Atom[];
  public readonly atomPath: string;

  public constructor(
    public readonly header: AtomToken.IAtomHeader,
    public extended: boolean,
    public readonly parent: Atom
  ) {
    this.children = [];
    this.atomPath =
      (this.parent ? this.parent.atomPath + "." : "") + this.header.name;
  }

  public getHeaderLength(): number {
    return this.extended ? 16 : 8;
  }

  public getPayloadLength(remaining: number): number {
    return (
      (this.header.length === BigInt(0)
        ? remaining
        : Number(this.header.length)) - this.getHeaderLength()
    );
  }

  public async readAtoms(
    tokenizer: ITokenizer,
    dataHandler: AtomDataHandler,
    size: number
  ): Promise<void> {
    while (size > 0) {
      const atomBean = await Atom.readAtom(tokenizer, dataHandler, this, size);
      this.children.push(atomBean);
      size -=
        atomBean.header.length === BigInt(0)
          ? size
          : Number(atomBean.header.length);
    }
  }

  private async readData(
    tokenizer: ITokenizer,
    dataHandler: AtomDataHandler,
    remaining: number
  ): Promise<void> {
    switch (this.header.name) {
      // "Container" atoms, contains nested atoms
      case "moov": // The Movie Atom: contains other atoms
      case "udta": // User defined atom
      case "trak":
      case "mdia": // Media atom
      case "minf": // Media Information Atom
      case "stbl": // The Sample Table Atom
      case "<id>":
      case "ilst":
      case "tref":
        return this.readAtoms(
          tokenizer,
          dataHandler,
          this.getPayloadLength(remaining)
        );

      case "meta": // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        // meta has 4 bytes of padding, ignore
        await tokenizer.ignore(4);
        return this.readAtoms(
          tokenizer,
          dataHandler,
          this.getPayloadLength(remaining) - 4
        );

      case "mdhd": // Media header atom
      case "mvhd": // 'movie' => 'mvhd': movie header atom; child of Movie Atom
      case "tkhd":
      case "stsz":
      case "mdat":
      default:
        return dataHandler(this, remaining);
    }
  }
}
