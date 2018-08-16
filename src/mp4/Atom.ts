import {ITokenizer} from "strtok3";
import {Promise} from "es6-promise";

import * as _debug from "debug";

const debug = _debug("music-metadata:parser:MP4:Atom");

import * as AtomToken from "./AtomToken";

import * as Token from "token-types";

export type AtomDataHandler = (atom: Atom) => Promise<void>;

export class Atom {

  public readonly children: Atom[];
  public readonly atomPath: string;
  public readonly dataLen: number;

  public constructor(public readonly header: AtomToken.IAtomHeader, public readonly parent: Atom) {
    this.children = [];
    this.atomPath = (this.parent ? this.parent.atomPath + '/' : '') + this.header.name;
    this.dataLen = this.header.length - 8;
  }

  public readAtoms(tokenizer: ITokenizer, listener: AtomDataHandler, size: number): Promise<void> {

    return this.readAtom(tokenizer, listener).then(atomBean => {
      this.children.push(atomBean);
      size -= atomBean.header.length;
      if (size > 0) {
        return this.readAtoms(tokenizer, listener, size);
      }
    });
  }

  private readAtom(tokenizer: ITokenizer, listener: AtomDataHandler): Promise<Atom> {

    // Parse atom header
    const offset = tokenizer.position;
    // debug("Reading next token on offset=%s...", offset); //  buf.toString('ascii')
    return tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header)
      .then(header => {
        const atomBean = new Atom(header, this);
        debug("parse atom name=%s, offset=%s, len=%s ", atomBean.atomPath, offset, header.length); //  buf.toString('ascii')
        return atomBean.readData(tokenizer, listener).then(() => {
          return atomBean;
        });
      });
  }

  private readData(tokenizer: ITokenizer, listener: AtomDataHandler): Promise<void> {
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
        return this.readAtoms(tokenizer, listener, this.dataLen);

      case "meta": // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        // meta has 4 bytes of padding, ignore
        return tokenizer.readToken<void>(new Token.IgnoreType(4))
          .then(() => {
            return this.readAtoms(tokenizer, listener, this.dataLen - 4);
          });

      case "mdhd": // Media header atom
      case "mvhd": // 'movie' => 'mvhd': movie header atom; child of Movie Atom
      case "tkhd":
      case "stsz":
      case "mdat":
      default:
        return listener(this);
    }
  }
}
