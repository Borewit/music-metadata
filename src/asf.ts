'use strict'
import * as equal from 'deep-equal'
import * as strtok from 'strtok2'
import {ParseType} from 'strtok2'
import common from './common'
import {IStreamParser, TagCallback} from './parser'
import ReadableStream = NodeJS.ReadableStream

interface IState {

  parse(callback, data, done): IState

  getExpectedType(): ParseType
}

abstract class State implements IState {

  protected nextState: IState
  protected size: number

  constructor(nextState: IState, size: number) {
    this.nextState = nextState
    this.size = size
  }

  public abstract parse(callback, data, done)

  public abstract getExpectedType()
}

class AsfParser implements IStreamParser {

  public static headerType = 'asf'

  public static startState: IState =
  {
    parse: () => {
      return AsfParser.idState
    },

    getExpectedType: () => {
      return strtok.DONE // unreachable statement
    }
  }

  public static finishedState: IState =
  {
    parse: () => {
      return AsfParser.finishedState
    },

    getExpectedType: () => {
      return strtok.DONE
    }
  }

  public static idState: IState =
  {
    parse: (callback, data, done) => {
      if (!equal(common.asfGuidBuf, data)) {
        done(new Error('expected asf header but was not found'))
        return AsfParser.finishedState
      }
      return new HeaderDataState()
    },

    getExpectedType: () => {
      return new strtok.BufferType(common.asfGuidBuf.length)
    }
  }

  public static getInstance(): AsfParser {
    return new AsfParser()
  }

  public parse(stream, callback, done) {

    let currentState: IState = AsfParser.startState

    strtok.parse(stream, (v, cb) => {
      currentState = currentState.parse(callback, v, done)
      return currentState.getExpectedType()
    })
  }
}

type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer

class Util {

  public static getParserForAttr(i: number): AttributeParser {
    return Util.attributeParsers[i]
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, 'utf16le'))
  }

  public static parseByteArrayAttr(buf: Buffer): Buffer {
    let newBuf = new Buffer(buf.length)
    buf.copy(newBuf)
    return newBuf
  }

  public static parseBoolAttr(buf: Buffer): boolean {
    return Util.parseDWordAttr(buf) === 1
  }

  public static parseDWordAttr(buf: Buffer): number {
    return buf.readUInt32LE(0)
  }

  public static parseQWordAttr(buf: Buffer): number {
    return Util.readUInt64LE(buf, 0)
  }

  public static parseWordAttr(buf: Buffer): number {
    return buf.readUInt16LE(0)
  }

  public static readUInt64LE(buffer, offset): number {
    let high = buffer.slice(offset, offset + 4).readUInt32LE(0)
    let low = buffer.slice(offset + 4, offset + 8).readUInt32LE(0)
    let maxuint32 = Math.pow(2, 32)
    return ((low * maxuint32) + (high >>> 0))
  }

  private static attributeParsers: AttributeParser[] = [
    Util.parseUnicodeAttr,
    Util.parseByteArrayAttr,
    Util.parseBoolAttr,
    Util.parseDWordAttr,
    Util.parseQWordAttr,
    Util.parseWordAttr,
    Util.parseByteArrayAttr
  ]
}

interface IGuidState {
  guid: Buffer

  getState(nextState: IState, size: number): IState
}

class ReadObjectState implements IState {

  public static stateByGuid(guidBuf) {
    for (let guidState of ReadObjectState.guidStates) {
      if (equal(guidState.guid, guidBuf)) {
        return guidState
      }
    }
    return null
  }

  private static guidStates: IGuidState[] = [
    {
      guid: new Buffer([
        0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11,
        0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65
      ]),

      getState: (nextState: IState, size: number) => {
        return new FilePropertiesObject(nextState, size)
      }
    },
    // ContentDescriptionObject
    {
      guid: new Buffer([
        0x33, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
        0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
      ]),

      getState: (nextState: IState, size: number) => {
        return new ContentDescriptionObjectState(nextState, size)
      }
    },
    // ExtendedContentDescriptionObject
    {
      guid: new Buffer([
        0x40, 0xA4, 0xD0, 0xD2, 0x07, 0xE3, 0xD2, 0x11,
        0x97, 0xF0, 0x00, 0xA0, 0xC9, 0x5E, 0xA8, 0x50
      ]),

      getState: (nextState: IState, size: number) => {
        return new ExtendedContentDescriptionObjectState(nextState, size)
      }
    }]

  protected size: number
  protected objectCount: number

  constructor(size: number, objectCount: number) {
    this.size = size
    this.objectCount = objectCount
  }

  public parse(callback, data, done) {
    let guid = data.slice(0, 16)
    let size = Util.readUInt64LE(data, 16)
    this.objectCount -= 1
    this.size -= size
    let nextState = (this.objectCount <= 0) ? AsfParser.finishedState : this
    let guidState = ReadObjectState.stateByGuid(guid)
    return guidState ? guidState.getState(nextState, size - 24) : new IgnoreObjectState(nextState, size - 24)
  }

  public getExpectedType() {
    return new strtok.BufferType(24)
  }
}

class HeaderDataState implements IState {

  public parse(callback, data, done) {
    let size = Util.readUInt64LE(data, 0)
    let objectCount = data.readUInt32LE(8)
    return new ReadObjectState(size, objectCount)
  }

  public getExpectedType() {
    // 8 bytes size
    // 4 bytes object count
    // 2 bytes ignore
    return new strtok.BufferType(14)
  }
}

class IgnoreObjectState extends State {

  constructor(nextState, size) {
    super(nextState, size)
  }

  public parse(callback: TagCallback, data, done) {
    if (this.nextState === AsfParser.finishedState) {
      done()
    }
    return this.nextState
  }

  public getExpectedType() {
    return new strtok.IgnoreType(this.size)
  }
}

class ContentDescriptionObjectState extends State {

  public static guid = new Buffer([
    0x33, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
    0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
  ])

  private static contentDescTags = ['Title', 'Author', 'Copyright', 'Description', 'Rating']

  constructor(nextState: IState, size: number) {
    super(nextState, size)
  }

  public parse(callback, data, done) {
    let lengths = [
      data.readUInt16LE(0),
      data.readUInt16LE(2),
      data.readUInt16LE(4),
      data.readUInt16LE(6),
      data.readUInt16LE(8)
    ]
    let pos = 10
    for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; i += 1) {
      let tagName = ContentDescriptionObjectState.contentDescTags[i]
      let length = lengths[i]
      let end = pos + length
      if (length > 0) {
        let value = Util.parseUnicodeAttr(data.slice(pos, end))
        callback(AsfParser.headerType, tagName, value)
      }
      pos = end
    }
    if (this.nextState === AsfParser.finishedState) {
      done()
    }
    return this.nextState
  }

  public getExpectedType() {
    return new strtok.BufferType(this.size)
  }

}

class ExtendedContentDescriptionObjectState extends State {

  constructor(nextState: IState, size: number) {
    super(nextState, size)
  }

  public parse(callback, data, done) {
    let attrCount = data.readUInt16LE(0)
    let pos = 2
    for (let i = 0; i < attrCount; i += 1) {
      let nameLen = data.readUInt16LE(pos)
      pos += 2
      let name = Util.parseUnicodeAttr(data.slice(pos, pos + nameLen))
      pos += nameLen
      let valueType = data.readUInt16LE(pos)
      pos += 2
      let valueLen = data.readUInt16LE(pos)
      pos += 2
      let value = data.slice(pos, pos + valueLen)
      pos += valueLen
      let parseAttr = Util.getParserForAttr(valueType)
      if (!parseAttr) {
        done(new Error('unexpected value headerType: ' + valueType))
        return AsfParser.finishedState
      }
      let attr = parseAttr(value)
      callback(AsfParser.headerType, name, attr)
    }
    if (this.nextState === AsfParser.finishedState) {
      done()
    }
    return this.nextState
  }

  public getExpectedType() {
    return new strtok.BufferType(this.size)
  }
}

class FilePropertiesObject extends State {

  constructor(nextState, size) {
    super(nextState, size)
  }

  public parse(callback, data, done) {
    // in miliseconds
    let playDuration = Util.parseQWordAttr(data.slice(40, 48)) / 10000
    callback('format', 'duration', playDuration / 1000)

    if (this.nextState === AsfParser.finishedState) {
      done()
    }
    return this.nextState
  }

  public getExpectedType() {
    return new strtok.BufferType(this.size)
  }

}

module.exports = AsfParser.getInstance()
