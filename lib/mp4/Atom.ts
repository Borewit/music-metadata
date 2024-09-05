import initDebug from 'debug';
import * as AtomToken from './AtomToken.js';
import { Header } from './AtomToken.js';

import type { ITokenizer } from 'strtok3';

export type AtomDataHandler = (atom: Atom, remaining: number) => Promise<void>;

const debug = initDebug('music-metadata:parser:MP4:Atom');

export class Atom {

  public static async readAtom(tokenizer: ITokenizer, dataHandler: AtomDataHandler, parent: Atom | null, remaining: number): Promise<Atom> {

    // Parse atom header
    const offset = tokenizer.position;
    debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
    const header = await tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header);
    const extended = header.length === 1n;
    if (extended) {
      header.length = await tokenizer.readToken<bigint>(AtomToken.ExtendedSize);
    }
    const atomBean = new Atom(header, extended, parent);
    const payloadLength = atomBean.getPayloadLength(remaining);
    debug(`parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`); //  buf.toString('ascii')
    await atomBean.readData(tokenizer, dataHandler, payloadLength);
    return atomBean;
  }

  public readonly children: Atom[];
  public readonly atomPath: string;

  public constructor(public readonly header: AtomToken.IAtomHeader, public extended: boolean, public readonly parent: Atom | null) {
    this.children = [];
    this.atomPath = (this.parent ? `${this.parent.atomPath}.` : '') + this.header.name;
  }

  public getHeaderLength(): number {
    return this.extended ? 16 : 8;
  }

  public getPayloadLength(remaining: number): number {
    return (this.header.length === 0n ? remaining : Number(this.header.length)) - this.getHeaderLength();
  }

  public async readAtoms(tokenizer: ITokenizer, dataHandler: AtomDataHandler, size: number): Promise<void> {
    while (size > 0) {
      const atomBean = await Atom.readAtom(tokenizer, dataHandler, this, size);
      this.children.push(atomBean);
      size -= atomBean.header.length === 0n ? size : Number(atomBean.header.length);
    }
  }

  private async readData(tokenizer: ITokenizer, dataHandler: AtomDataHandler, remaining: number): Promise<void> {

    switch (this.header.name) {
      // "Container" atoms, contains nested atoms
      case 'moov': // The Movie Atom: contains other atoms
      case 'udta': // User defined atom
      case 'trak':
      case 'mdia': // Media atom
      case 'minf': // Media Information Atom
      case 'stbl': // The Sample Table Atom
      case '<id>':
      case 'ilst':
      case 'tref':
        return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining));

      case 'meta': { // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        // meta has 4 bytes of padding, ignore
        const peekHeader = await tokenizer.peekToken(Header);
        const paddingLength = peekHeader.name === 'hdlr' ? 0 : 4;
        await tokenizer.ignore(paddingLength);
        return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining) - paddingLength);
      }
      default:
        return dataHandler(this, remaining);
    }
  }
}
