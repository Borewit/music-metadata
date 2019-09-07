import {ITokenizer, endOfFile} from "strtok3/lib/type";
import * as initDebug from "debug";
import * as Token from "token-types";

import * as AtomToken from "./AtomToken";

export type AtomDataHandler = (atom: Atom) => Promise<void>;

const debug = initDebug("music-metadata:parser:MP4:Atom");

export class Atom {

  public readonly children: Atom[];
  public readonly atomPath: string;
  public readonly dataLen: number;

  public constructor(public readonly header: AtomToken.IAtomHeader, public extended: boolean, public readonly parent: Atom) {
    this.children = [];
    this.atomPath = (this.parent ? this.parent.atomPath + '/' : '') + this.header.name;
    this.dataLen = this.header.length - (extended ? 16 : 8);
  }

  public async readAtoms(tokenizer: ITokenizer, dataHandler: AtomDataHandler, size: number): Promise<void> {

    const atomBean = await this.readAtom(tokenizer, dataHandler);
    this.children.push(atomBean);
    if (size === undefined) {
      return this.readAtoms(tokenizer, dataHandler, size).catch(err => {
        if (err.message === endOfFile) {
          debug(`Reached end-of-file`);
        } else {
          throw err;
        }
      });
    }
    size -= atomBean.header.length;
    if (size > 0) {
      return this.readAtoms(tokenizer, dataHandler, size);
    }
  }

  private async readAtom(tokenizer: ITokenizer, dataHandler: AtomDataHandler): Promise<Atom> {

    // Parse atom header
    const offset = tokenizer.position;
    // debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
    const header = await tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header);
    const extended = header.length === 1;
    if (extended) {
      header.length = await tokenizer.readToken<number>(AtomToken.ExtendedSize);
    }
    const atomBean = new Atom(header, extended, this);
    debug(`parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`); //  buf.toString('ascii')
    await atomBean.readData(tokenizer, dataHandler);
    return atomBean;
  }

  private async readData(tokenizer: ITokenizer, dataHandler: AtomDataHandler): Promise<void> {
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
        return this.readAtoms(tokenizer, dataHandler, this.dataLen);

      case "meta": // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        // meta has 4 bytes of padding, ignore
        await tokenizer.readToken<void>(new Token.IgnoreType(4));
        return this.readAtoms(tokenizer, dataHandler, this.dataLen - 4);

      case "mdhd": // Media header atom
      case "mvhd": // 'movie' => 'mvhd': movie header atom; child of Movie Atom
      case "tkhd":
      case "stsz":
      case "mdat":
      default:
        return dataHandler(this);
    }
  }
}
