import ReadableStream = NodeJS.ReadableStream
import * as strtok from 'strtok2'
import common from './common'
import id3v2_frames from './id3v2_frames'
import {IStreamParser, TagCallback} from './parser'
import {HeaderType} from './tagmap'

interface Iid3Header {
  version: string,
  major: number,
  unsync: boolean,
  xheader: boolean,
  xindicator: boolean,
  footer: boolean,
  size: number,
}

interface IFormatInfo {
  version: number | string,
  layer: number | string,
  protection: boolean,
  padding: boolean,
  mode: string,
  samples_per_frame?: number,
  bitrate?: number,
  slot_size?: number | string,
  sample_rate?: number,
  sideinfo_length?: number,
  frame_size?: number,
  codecProfile?: string

}

interface IFrameFlags {
  status: {
    tag_alter_preservation: boolean,
    file_alter_preservation: boolean,
    read_only: boolean
  },
  format: {
    grouping_identity: boolean,
    compression: boolean,
    encryption: boolean,
    unsync: boolean,
    data_length_indicator: boolean
  }
}
interface IFrameHeader {
  id?: string,
  length?: number
  flags?: IFrameFlags
}

enum State {
  header = 0,
  id3_data = 1,
  x = 1.5, // ToDo
  audio_frame_header = 2,
  side_information = 3,
  xtra_info_header = 4,
  skip_frame_data = 5

}

class Structure {

  /**
   * Info Tag
   * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
   */
  public static InfoTag = {
    len: 140,

    get: (buf, off) => {
      return {
        // 4 bytes for Header Tag
        headerTag: new strtok.StringType(4, 'ascii').get(buf, off),
        // 4 bytes for HeaderFlags
        headerFlags: new strtok.BufferType(4).get(buf, off + 4),

        // 100 bytes for entry (NUMTOCENTRIES)
        // numToCentries: new strtok.BufferType(100).get(buf, off + 8),
        // FRAME SIZE
        // frameSize: strtok.UINT32_BE.get(buf, off + 108),

        numFrames: strtok.UINT32_BE.get(buf, off + 8),

        numToCentries: new strtok.BufferType(100).get(buf, off + 108),

        // the number of header APE_HEADER bytes
        streamSize: strtok.UINT32_BE.get(buf, off + 112),
        // the number of header data bytes (from original file)
        vbrScale: strtok.UINT32_BE.get(buf, off + 116),

        /**
         * LAME Tag, extends the Xing header format
         * First added in LAME 3.12 for VBR
         * The modified header is also included in CBR files (effective LAME 3.94), with "Info" instead of "XING" near the beginning.
         */

        //  Initial LAME info, e.g.: LAME3.99r
        encoder: new strtok.StringType(9, 'ascii').get(buf, off + 120),
        //  Info Tag
        infoTag: strtok.UINT8.get(buf, off + 129) >> 4,
        // VBR method
        vbrMethod: strtok.UINT8.get(buf, off + 129) & 0xf
      }
    }
  }
}

class Id3v2Parser implements IStreamParser {

  public static getInstance(): Id3v2Parser {
    return new Id3v2Parser()
  }

  private static bitrate_index = {
    0x01: {11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8},
    0x02: {11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16},
    0x03: {11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24},
    0x04: {11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32},
    0x05: {11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40},
    0x06: {11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48},
    0x07: {11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56},
    0x08: {11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64},
    0x09: {11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80},
    0x0A: {11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96},
    0x0B: {11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112},
    0x0C: {11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128},
    0x0D: {11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144},
    0x0E: {11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160}
  }

  private static sampling_rate_freq_index = {
    1: {0x00: 44100, 0x01: 48000, 0x02: 32000},
    2: {0x00: 22050, 0x01: 24000, 0x02: 16000},
    2.5: {0x00: 11025, 0x01: 12000, 0x02: 8000}
  }

  private static calcDuration(numFrames, samplesPerFrame, sampleRate): number {
    return Math.round(numFrames * (samplesPerFrame / sampleRate))
  }

  private static readFrameHeader(v, majorVer): IFrameHeader {
    let header: IFrameHeader = {}
    switch (majorVer) {
      case 2:
        header.id = v.toString('ascii', 0, 3)
        header.length = common.strtokUINT24_BE.get(v, 3)
        break
      case 3:
        header.id = v.toString('ascii', 0, 4)
        header.length = strtok.UINT32_BE.get(v, 4)
        header.flags = Id3v2Parser.readFrameFlags(v.slice(8, 10))
        break
      case 4:
        header.id = v.toString('ascii', 0, 4)
        header.length = common.strtokINT32SYNCSAFE.get(v, 4)
        header.flags = Id3v2Parser.readFrameFlags(v.slice(8, 10))
        break
      default:
        throw new Error('Unexpected majorVer: ' + majorVer)
    }
    return header
  }

  private static getFrameHeaderLength(majorVer, done): number {
    switch (majorVer) {
      case 2:
        return 6
      case 3:
      case 4:
        return 10
      default:
        return done(new Error('header version is incorrect'))
    }
  }

  private static readFrameFlags(b: Buffer): IFrameFlags {
    return {
      status: {
        tag_alter_preservation: common.strtokBITSET.get(b, 0, 6),
        file_alter_preservation: common.strtokBITSET.get(b, 0, 5),
        read_only: common.strtokBITSET.get(b, 0, 4)
      },
      format: {
        grouping_identity: common.strtokBITSET.get(b, 1, 7),
        compression: common.strtokBITSET.get(b, 1, 3),
        encryption: common.strtokBITSET.get(b, 1, 2),
        unsync: common.strtokBITSET.get(b, 1, 1),
        data_length_indicator: common.strtokBITSET.get(b, 1, 0)
      }
    }
  }

  private static readMpegVersion(byte): number | string {
    let bits = (byte & 0x18) >> 3

    if (bits === 0x00) {
      return 2.5
    } else if (bits === 0x01) {
      return 'reserved'
    } else if (bits === 0x02) {
      return 2
    } else if (bits === 0x03) {
      return 1
    }
  }

  private static readLayer(byte): string | number {
    let bits = (byte & 0x6) >> 1

    if (bits === 0x00) {
      return 'reserved'
    } else if (bits === 0x01) {
      return 3
    } else if (bits === 0x02) {
      return 2
    } else if (bits === 0x03) {
      return 1
    }
  }

  private static readMode(byte): string {
    let bits = (byte & 0xC0) >> 6
    if (bits === 0x00) {
      return 'stereo'
    } else if (bits === 0x01) {
      return 'joint_stereo'
    } else if (bits === 0x02) {
      return 'dual_channel'
    } else if (bits === 0x03) {
      return 'mono'
    }
  }

  private static calcSamplesPerFrame(version, layer) {
    if (layer === 1) return 384
    if (layer === 2) return 1152
    if (layer === 3 && version === 1) return 1152
    if (layer === 3 && (version === 2 || version === 2.5)) return 576
  }

  private static calculateSideInfoLength(layer, mode, version) {
    if (layer !== 3) return 2
    if (['stereo', 'joint_stereo', 'dual_channel'].indexOf(mode) >= 0) {
      if (version === 1) {
        return 32
      } else if (version === 2 || version === 2.5) {
        return 17
      }
    } else if (mode === 'mono') {
      if (version === 1) {
        return 17
      } else if (version === 2 || version === 2.5) {
        return 9
      }
    }
  }

  private static calcSlotSize(layer): number | string {
    if (layer === 0) return 'reserved'
    if (layer === 1) return 4
    if (layer === 2) return 1
    if (layer === 3) return 1
  }

  private static id3BitrateCalculator(byte, mpegVersion, layer) {
    let bits = (byte & 0xF0) >> 4
    if (bits === 0x00) return 'free'
    if (bits === 0x0F) return 'reserved'
    return Id3v2Parser.bitrate_index[bits][mpegVersion.toString() + layer]
  }

  private static samplingRateCalculator(byte, version) {
    let bits = (byte & 0xC) >> 2
    if (bits === 0x03) return 'reserved'
    return Id3v2Parser.sampling_rate_freq_index[version][bits]
  }

  private static getVbrCodecProfile(vbrScale: number): string {
    return 'V' + (100 - vbrScale) / 10
  }

  private state: State = State.header
  private frameCount: number
  private frameFragment: Buffer

  public parse(stream, callback, done, readDuration, fileSize) {
    let self: Id3v2Parser = this

    let id3Header: Iid3Header
    let headerType: HeaderType
    let audioFrameHeader
    let bitrates: number[] = []
    let offset: number
    let header: IFormatInfo

    strtok.parse(stream, (v, cb) => {
      if (v === undefined) {
        self.state = State.header
        self.frameCount = 0
        self.frameFragment = null
        return new strtok.BufferType(10)
      }

      switch (self.state) {
        case State.header: // header
          if (v.toString('ascii', 0, 3) !== 'ID3') {
            return done(new Error('expected id3 header but was not found'))
          }
          id3Header = {
            version: '2.' + v[3] + '.' + v[4],
            major: v[3],
            unsync: common.strtokBITSET.get(v, 5, 7),
            xheader: common.strtokBITSET.get(v, 5, 6),
            xindicator: common.strtokBITSET.get(v, 5, 5),
            footer: common.strtokBITSET.get(v, 5, 4),
            size: common.strtokINT32SYNCSAFE.get(v, 6)
          }
          self.state = State.id3_data
          headerType = <HeaderType> ('id3v2.' + v[3])
          return new strtok.BufferType(id3Header.size)

        case State.id3_data: // id3 data
          this.parseMetadata(v, id3Header, done).map((obj) => {
            callback.apply(this, [headerType].concat(obj))
          })
          if (readDuration) {
            self.state = State.audio_frame_header
            return new strtok.BufferType(4)
          }
          return done()

        case State.x:
          let shiftedBuffer = new Buffer(4)
          self.frameFragment.copy(shiftedBuffer, 0, 1)
          v.copy(shiftedBuffer, 3)
          v = shiftedBuffer
          self.state = State.audio_frame_header

        /* falls through */
        case State.audio_frame_header: // audio frame header

          // we have found the id3 tag at the end of the file, ignore
          if (v.slice(0, 3).toString() === 'TAG') {
            return done()
          }

          // first 11 bits should all be set (frame sync)
          if ((v[0] === 0xFF && (v[1] & 0xE0) === 0xE0) !== true) {
            // keep scanning for frame header, id3 tag may
            // have some padding (0x00) at the end
            return this.seekFirstAudioFrame(v, cb, done)
          }

          header = {
            version: Id3v2Parser.readMpegVersion(v[1]),
            layer: Id3v2Parser.readLayer(v[1]),
            protection: !(v[1] & 0x1),
            padding: !!((v[2] & 0x02) >> 1),
            mode: Id3v2Parser.readMode(v[3])
          }

          if (isNaN(Number(header.version)) || isNaN(Number(header.layer))) {
            return this.seekFirstAudioFrame(v, cb, done)
          }

          // mp3 files are only found in MPEG1/2 Layer 3
          if ((header.version !== 1 && header.version !== 2) || <number> (header.layer) !== 3) {
            return this.seekFirstAudioFrame(v, cb, done)
          }

          header.samples_per_frame = Id3v2Parser.calcSamplesPerFrame(header.version, header.layer)

          header.bitrate = Id3v2Parser.id3BitrateCalculator(v[2], header.version, header.layer)
          if (isNaN(header.bitrate)) {
            return this.seekFirstAudioFrame(v, cb, done)
          }

          header.sample_rate = Id3v2Parser.samplingRateCalculator(v[2], header.version)
          if (isNaN(header.sample_rate)) {
            return this.seekFirstAudioFrame(v, cb, done)
          }

          callback('format', 'headerType', headerType)
          callback('format', 'bitrate', header.bitrate * 1000)
          callback('format', 'sampleRate', header.sample_rate)
          callback('format', 'numberOfChannels', header.mode === 'mono' ? 1 : 2)

          header.slot_size = Id3v2Parser.calcSlotSize(header.layer)
          if ( isNaN(Number(header.slot_size)) ) {
            done(new Error('slot_size is not a anumber'))
          }
          let slot_size = <number> header.slot_size

          header.sideinfo_length = Id3v2Parser.calculateSideInfoLength(
            header.layer, header.mode, header.version)

          let bps = header.samples_per_frame / 8.0
          let fsize = (bps * (header.bitrate * 1000) / header.sample_rate) +
            ((header.padding) ? slot_size : 0)
          header.frame_size = Math.floor(fsize)

          audioFrameHeader = header
          self.frameCount++
          bitrates.push(header.bitrate)

          // xtra header only exists in first frame
          if ( self.frameCount === 1) {
            offset = header.sideinfo_length
            self.state = State.side_information
            return new strtok.BufferType(header.sideinfo_length)
          }

          // the stream is CBR if the first 3 frame bitrates are the same
          if (readDuration && fileSize && self.frameCount === 3 && this.areAllSame(bitrates)) {
            fileSize((size) => {
              // subtract non audio stream data from duration calculation
              size = size - id3Header.size
              let kbps = (header.bitrate * 1000) / 8
              callback('format', 'duration', size / kbps)
              cb(done())
            })
            return strtok.DEFER
          }

          // once we know the file is VBR attach listener to end of
          // stream so we can do the duration calculation when we
          // have counted all the frames
          if (readDuration &&  self.frameCount === 4) {
            stream.once('end', () => {
              callback('format', 'duration',
                Id3v2Parser.calcDuration( self.frameCount, header.samples_per_frame, header.sample_rate))
              done()
            })
          }

          self.state = State.skip_frame_data
          return new strtok.IgnoreType(header.frame_size - 4)

        case State.side_information: // side information
          offset += 12
          self.state = State.xtra_info_header
          return Structure.InfoTag

        case State.xtra_info_header: // xtra / info header
          self.state = State.skip_frame_data
          let frameDataLeft = audioFrameHeader.frame_size - 132 - offset

          switch (v.headerTag) {
            case 'Info':
              header.codecProfile = 'CBR'
              break
            case 'Xing':
              header.codecProfile = Id3v2Parser.getVbrCodecProfile(v.vbrScale)
              break
            case 'Xtra':
              // ToDo: ???
              break
            default:
              return new strtok.IgnoreType(frameDataLeft)
          }

          callback('format', 'encoder', v.encoder)
          callback('format', 'codecProfile', header.codecProfile)

          // frames field is not present
          if ((v.headerFlags[3] & 0x01) !== 1) {
            return new strtok.IgnoreType(frameDataLeft)
          }

          let ah = audioFrameHeader
          callback('format', 'duration', Id3v2Parser.calcDuration(v.numFrames, ah.samples_per_frame, ah.sample_rate))
          return done()

        case State.skip_frame_data: // skip frame data
          self.state = State.audio_frame_header
          return new strtok.BufferType(4)

        default:
          done(new Error('Undefined state: ' + self.state))
      }
    })
  }

  private seekFirstAudioFrame(v, cb, done) {
    if (this.frameCount) {
      return done(new Error('expected frame header but was not found'))
    }

    this.frameFragment = v
    this.state = State.x
    return new strtok.BufferType(1)
  }

  private areAllSame(array) {
    let first = array[0]
    return array.every((element) => {
      return element === first
    })
  }

  private parseMetadata(data, header, done) {
    let offset = 0
    let frames = []

    if (header.xheader) {
      offset += data.readUInt32BE(0)
    }

    while (true) {
      if (offset === data.length) break
      let frameHeaderBytes = data.slice(offset, offset += Id3v2Parser.getFrameHeaderLength(header.major, done))
      let frameHeader = Id3v2Parser.readFrameHeader(frameHeaderBytes, header.major)

      // Last frame. Check first char is a letter, bit of defensive programming
      if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
        break
      }

      let frameDataBytes = data.slice(offset, offset += frameHeader.length)
      let frameData = this.readFrameData(frameDataBytes, frameHeader, header.major)
      for (let pos in frameData) {
        if (frameData.hasOwnProperty(pos)) {
          frames.push([frameHeader.id, frameData[pos]])
        }
      }
    }
    return frames
  }

  private readFrameData(v, frameHeader, majorVer) {
    switch (majorVer) {
      case 2:
        return id3v2_frames.readData(v, frameHeader.id, null, majorVer)
      case 3:
      case 4:
        if (frameHeader.flags.format.unsync) {
          v = common.removeUnsyncBytes(v)
        }
        if (frameHeader.flags.format.data_length_indicator) {
          v = v.slice(4, v.length)
        }
        return id3v2_frames.readData(v, frameHeader.id, frameHeader.flags, majorVer)
      default:
        throw new Error('Unexpected majorVer: ' + majorVer)
    }
  }
}

module.exports = Id3v2Parser.getInstance()
