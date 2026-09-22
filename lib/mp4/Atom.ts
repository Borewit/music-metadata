import initDebug from 'debug';
import type { ITokenizer } from 'strtok3';
import * as AtomToken from './AtomToken.js';
import { Header, Mp4ContentError } from './AtomToken.js';

export type AtomDataHandler = (atom: Atom, remaining: number) => Promise<void>;

const debug = initDebug('music-metadata:parser:MP4:Atom');

export class Atom {
  public static async readAtom(
    tokenizer: ITokenizer,
    dataHandler: AtomDataHandler,
    parent: Atom | null,
    remaining: number
  ): Promise<Atom> {
    // Validate boundaries before reading either header or dispatching a payload parser.
    const offset = tokenizer.position;
    remaining = Math.min(remaining, (tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY) - offset);
    if (remaining < AtomToken.Header.len) {
      throw new Mp4ContentError('Truncated atom header');
    }
    debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
    const header = await tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header);
    const extended = header.length === 1n;
    if (extended) {
      if (remaining < 16) {
        throw new Mp4ContentError('Truncated extended atom header');
      }
      header.length = await tokenizer.readToken<bigint>(AtomToken.ExtendedSize);
    }
    const headerLength = extended ? 16 : 8;
    if ((extended || header.length !== 0n) && header.length < BigInt(headerLength)) {
      throw new Mp4ContentError(`Invalid atom size: ${header.length}`);
    }
    if (header.length > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Mp4ContentError(`Atom size exceeds Number.MAX_SAFE_INTEGER: ${header.length}`);
    }
    const length = header.length === 0n ? remaining : Number(header.length);
    if (length > remaining) {
      throw new Mp4ContentError(`Atom size exceeds remaining bytes: ${header.length} > ${remaining}`);
    }
    const payloadLength = length - headerLength;
    const atomBean = new Atom(header, extended, parent, payloadLength);
    debug(
      `parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`
    ); //  buf.toString('ascii')
    await atomBean.readData(tokenizer, dataHandler, payloadLength);
    return atomBean;
  }

  public readonly children: Atom[];
  public readonly atomPath: string;

  public readonly header: AtomToken.IAtomHeader;
  public extended: boolean;
  public readonly parent: Atom | null;

  public constructor(
    header: AtomToken.IAtomHeader,
    extended: boolean,
    parent: Atom | null,
    private readonly payloadLength: number
  ) {
    this.header = header;
    this.extended = extended;
    this.parent = parent;
    this.children = [];
    this.atomPath = (this.parent ? `${this.parent.atomPath}.` : '') + this.header.name;
  }

  public getHeaderLength(): number {
    return this.extended ? 16 : 8;
  }

  public getPayloadLength(): number {
    return this.payloadLength;
  }

  public async readAtoms(tokenizer: ITokenizer, dataHandler: AtomDataHandler, size: number): Promise<void> {
    while (size > 0) {
      if (size === Number.POSITIVE_INFINITY) {
        // An open-ended container ends only at clean EOF, before the next header.
        const bytesRead = await tokenizer.peekBuffer(new Uint8Array(Header.len), { mayBeLess: true });
        if (bytesRead === 0) {
          return;
        }
        if (bytesRead < Header.len) {
          throw new Mp4ContentError('Truncated atom header');
        }
      }
      const atomBean = await Atom.readAtom(tokenizer, dataHandler, this, size);
      this.children.push(atomBean);
      size = atomBean.header.length === 0n ? 0 : size - Number(atomBean.header.length);
    }
  }

  private async readData(tokenizer: ITokenizer, dataHandler: AtomDataHandler, remaining: number): Promise<void> {
    switch (this.header.name) {
      // "Container" atoms, contains nested atoms
      case 'moov': // The Movie Atom: contains other atoms
      case 'udta': // User defined atom
      case 'mdia': // Media atom
      case 'minf': // Media Information Atom
      case 'stbl': // The Sample Table Atom
      case '<id>':
      case 'ilst':
      case 'tref':
      case 'moof':
        return this.readAtoms(tokenizer, dataHandler, remaining);

      case 'meta': {
        // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        if (remaining < 8) {
          throw new Mp4ContentError('Truncated meta atom');
        }
        // meta has 4 bytes of padding, ignore
        const peekHeader = await tokenizer.peekToken(Header);
        const paddingLength = peekHeader.name === 'hdlr' ? 0 : 4;
        await tokenizer.ignore(paddingLength);
        return this.readAtoms(tokenizer, dataHandler, remaining - paddingLength);
      }
      default:
        return dataHandler(this, remaining);
    }
  }
}
