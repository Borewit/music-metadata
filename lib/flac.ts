'use strict'

import * as strtok from 'strtok2'
import common from './common'
import {IStreamParser, TagCallback} from './parser'
import {HeaderType} from './tagmap'
import vorbis from './vorbis'

interface IState {

  parse (callback, data, done): IState

  getExpectedType ()
}

export class FlacParser implements IStreamParser {

  public static headerType: HeaderType = 'vorbis'

  public static getInstance(): FlacParser {
    return new FlacParser()
  }

  public parse(stream, callback: TagCallback, done?, readDuration?, fileSize?) {
    let currentState: IState = startState

    strtok.parse(stream, (v, cb) => {
      currentState = currentState.parse(callback, v, done)
      return currentState.getExpectedType()
    })
  }
}

class DataDecoder {

  private data: Buffer
  private offset: number

  constructor(data: Buffer) {
    this.data = data
    this.offset = 0
  }

  public readInt32(): number {
    let value = strtok.UINT32_LE.get(this.data, this.offset)
    this.offset += 4
    return value
  }

  public readStringUtf8(): string {
    let len = this.readInt32()
    let value = this.data.toString('utf8', this.offset, this.offset + len)
    this.offset += len
    return value
  }
}

// ToDo: same in ASF
let finishedState: IState = {

  parse: (callback) => {
    return finishedState // ToDo: correct?
  },

  getExpectedType: () => {
    return strtok.DONE
  }
}

class BlockDataState implements IState {

  private type: number
  private length: number
  private nextStateFactory

  constructor(type, length, nextStateFactory) {
    this.type = type
    this.length = length
    this.nextStateFactory = nextStateFactory
  }

  public parse(callback, data) {
    if (this.type === 4) {
      let decoder = new DataDecoder(data)
      decoder.readStringUtf8() // vendor (skip)
      let commentListLength = decoder.readInt32()
      for (let i = 0; i < commentListLength; i++) {
        let comment = decoder.readStringUtf8()
        let split = comment.split('=')
        callback(FlacParser.headerType, split[0].toUpperCase(), split[1])
      }
    } else if (this.type === 6) {
      let picture = vorbis.readPicture(data)
      callback(FlacParser.headerType, 'METADATA_BLOCK_PICTURE', picture)
    } else if (this.type === 0) { // METADATA_BLOCK_STREAMINFO
      if (data.length < 34) return // invalid streaminfo
      // Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
      let sampleRate = common.strtokUINT24_BE.get(data, 10) >> 4
      let channels = common.getBitAllignedNumber(data, 100, 3) + 1
      let bitsPerSample = common.getBitAllignedNumber(data, 103, 5) + 1
      let totalSamples = data.readUInt32BE(14)
      let duration = totalSamples / sampleRate
      callback('format', 'numberOfChannels', channels)
      callback('format', 'bitsPerSample', bitsPerSample)
      callback('format', 'headerType', FlacParser.headerType)
      callback('format', 'sampleRate', sampleRate)
      callback('format', 'duration', duration)
    }

    return this.nextStateFactory()
  }

  public getExpectedType() {
    return new strtok.BufferType(this.length)
  }
}

let blockHeaderState: IState = {
  parse: (callback, data, done) => {
    let header = {
      lastBlock: (data[0] & 0x80) === 0x80,
      type: data[0] & 0x7f,
      length: common.strtokUINT24_BE.get(data, 1)
    }
    let followingStateFactory = header.lastBlock ? () => {
      done()
      return finishedState
    } : () => {
      return blockHeaderState
    }

    return new BlockDataState(header.type, header.length, followingStateFactory)
  },
  getExpectedType: () => {
    return new strtok.BufferType(4)
  }
}

let idState: IState = {

  parse: (callback, data, done) => {
    if (data.toString() !== 'fLaC') {
      done(new Error('expected flac header but was not found'))
    }
    return blockHeaderState
  },

  getExpectedType: () => {
    return new strtok.BufferType(4)
  }
}

let startState: IState = {

  parse: (callback) => {
    return idState
  },

  getExpectedType: () => {
    return strtok.DONE
  }
}

module.exports = FlacParser.getInstance()
