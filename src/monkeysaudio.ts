'use strict'

import * as strtok from 'strtok2'
import common from './common'
import {IStreamParser, TagCallback} from './parser'
import {HeaderType} from './tagmap'

/**
 * APETag version history / supported formats
 *
 *  1.0 (1000) - Original APE tag spec.  Fully supported by this code.
 *  2.0 (2000) - Refined APE tag spec (better streaming support, UTF encoding). Fully supported by this code.
 *
 *  Notes:
 *  - also supports reading of ID3v1.1 tags
 *  - all saving done in the APE Tag format using CURRENT_APE_TAG_VERSION
 *
 * APE File Format Overview: (pieces in order -- only valid for the latest version APE files)
 *
 * JUNK - any amount of "junk" before the APE_DESCRIPTOR (so people that put ID3v2 tags on the files aren't hosed)
 * APE_DESCRIPTOR - defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 * APE_HEADER - describes all of the necessary information about the APE file
 * SEEK TABLE - the table that represents seek offsets [optional]
 * HEADER DATA - the pre-audio data from the original file [optional]
 * APE FRAMES - the actual compressed audio (broken into frames for seekability)
 * TERMINATING DATA - the post-audio data from the original file [optional]
 * TAG - describes all the properties of the file [optional]
 */

type Descriptor = {
  // should equal 'MAC '
  ID: string,
  // version number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
  version: number,
  // the number of descriptor bytes (allows later expansion of this header)
  descriptorBytes: number,
  // the number of header APE_HEADER bytes
  headerBytes: number,
  // the number of header APE_HEADER bytes
  seekTableBytes: number,
  // the number of header data bytes (from original file)
  headerDataBytes: number,
  // the number of bytes of APE frame data
  apeFrameDataBytes: number,
  // the high order number of APE frame data bytes
  apeFrameDataBytesHigh: number,
  // the terminating data of the file (not including tag data)
  terminatingDataBytes: number,
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: number[]
}

/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
type Header = {
  // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
  compressionLevel: number,
  // any format flags (for future use)
  formatFlags: number,
  // the number of audio blocks in one frame
  blocksPerFrame: number,
  // the number of audio blocks in the final frame
  finalFrameBlocks: number,
  // the total number of frames
  totalFrames: number,
  // the bits per sample (typically 16)
  bitsPerSample: number,
  // the number of channels (1 or 2)
  channel: number,
  // the sample rate (typically 44100)
  sampleRate: number
}

type Footer = {
  // should equal 'APETAGEX'
  ID: string,
  // equals CURRENT_APE_TAG_VERSION
  version: number,
  // the complete size of the tag, including this footer (excludes header)
  size: number,
  // the number of fields in the tag
  fields: number,
  // reserved for later use (must be zero)
  reserved: number[] // ToDo: what is this???
}

type TagFlags = {
  containsHeader: boolean,
  containsFooter: boolean,
  isHeader: boolean,
  readOnly: boolean,
  dataType: DataType
}

enum DataType {
  text_utf8 = 0,
  binary = 1,
  external_info = 2,
  reserved = 3
}

class Structure {
  /**
   * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
   */
  public static DescriptorParser = {
    len: 52,

    get: (buf, off) => {
      return {
        // should equal 'MAC '
        ID: new strtok.StringType(4, 'ascii').get(buf, off),
        // version number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
        version: strtok.UINT32_LE.get(buf, off + 4) / 1000,
        // the number of descriptor bytes (allows later expansion of this header)
        descriptorBytes: strtok.UINT32_LE.get(buf, off + 8),
        // the number of header APE_HEADER bytes
        headerBytes: strtok.UINT32_LE.get(buf, off + 12),
        // the number of header APE_HEADER bytes
        seekTableBytes: strtok.UINT32_LE.get(buf, off + 16),
        // the number of header data bytes (from original file)
        headerDataBytes: strtok.UINT32_LE.get(buf, off + 20),
        // the number of bytes of APE frame data
        apeFrameDataBytes: strtok.UINT32_LE.get(buf, off + 24),
        // the high order number of APE frame data bytes
        apeFrameDataBytesHigh: strtok.UINT32_LE.get(buf, off + 28),
        // the terminating data of the file (not including tag data)
        terminatingDataBytes: strtok.UINT32_LE.get(buf, off + 32),
        // the MD5 hash of the file (see notes for usage... it's a littly tricky)
        fileMD5: new strtok.BufferType(16).get(buf, off + 36)
      }
    }
  }

  /**
   * APE_HEADER: describes all of the necessary information about the APE file
   */
  public static Header = {
    len: 24,

    get: (buf, off) => {
      return {
        // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
        compressionLevel: strtok.UINT16_LE.get(buf, off),
        // any format flags (for future use)
        formatFlags: strtok.UINT16_LE.get(buf, off + 2),
        // the number of audio blocks in one frame
        blocksPerFrame: strtok.UINT32_LE.get(buf, off + 4),
        // the number of audio blocks in the final frame
        finalFrameBlocks: strtok.UINT32_LE.get(buf, off + 8),
        // the total number of frames
        totalFrames: strtok.UINT32_LE.get(buf, off + 12),
        // the bits per sample (typically 16)
        bitsPerSample: strtok.UINT16_LE.get(buf, off + 16),
        // the number of channels (1 or 2)
        channel: strtok.UINT16_LE.get(buf, off + 18),
        // the sample rate (typically 44100)
        sampleRate: strtok.UINT32_LE.get(buf, off + 20)
      }
    }
  }

  /**
   * TAG: describes all the properties of the file [optional]
   */
  public static TagFooter = {
    len: 32,

    get: (buf, off) => {
      return {
        // should equal 'APETAGEX'
        ID: new strtok.StringType(8, 'ascii').get(buf, off),
        // equals CURRENT_APE_TAG_VERSION
        version: strtok.UINT32_LE.get(buf, off + 8),
        // the complete size of the tag, including this footer (excludes header)
        size: strtok.UINT32_LE.get(buf, off + 12),
        // the number of fields in the tag
        fields: strtok.UINT32_LE.get(buf, off + 16),
        // reserved for later use (must be zero)
        reserved: new strtok.BufferType(12).get(buf, off + 20) // ToDo: what is this???
      }
    }
  }

  public static TagField = (footer) => {
    return new strtok.BufferType(footer.size - Structure.TagFooter.len)
  }

  public static parseTagFlags(flags): TagFlags {
    return {
      containsHeader: Structure.isBitSet(flags, 31),
      containsFooter: Structure.isBitSet(flags, 30),
      isHeader: Structure.isBitSet(flags, 31),
      readOnly: Structure.isBitSet(flags, 0),
      dataType: (flags & 6) >> 1
    }
  }

  /**
   * @param num {number}
   * @param bit 0 is least significant bit (LSB)
   * @return {boolean} true if bit is 1; otherwise false
   */
  public static isBitSet(num, bit): boolean {
    return (num & 1 << bit) !== 0
  }

}

type ApeInfo = {
  descriptor?: Descriptor,
  header?: Header,
  footer?: Footer
}

class ApeParser implements IStreamParser {

  public static getInstance(): ApeParser {
    return new ApeParser()
  }
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  public static calculateDuration(ah: Header): number {
    let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0
    duration += ah.finalFrameBlocks
    return duration / ah.sampleRate
  }

  private type: HeaderType = 'APEv2' // ToDo: version should be made dynamic, APE may also contain ID3

  private ape: ApeInfo = {}

  public parse(stream, callback: TagCallback, done?, readDuration?, fileSize?) {

    strtok.parse(stream, (v, cb) => {
      if (v === undefined) {
        cb.state = 'descriptor'
        return Structure.DescriptorParser
      }

      switch (cb.state) {
        case 'descriptor':
          if (v.ID !== 'MAC ') {
            throw new Error('Expected MAC on beginning of file') // ToDo: strip/parse JUNK
          }
          this.ape.descriptor = v
          let lenExp = v.descriptorBytes - Structure.DescriptorParser.len
          if (lenExp > 0) {
            cb.state = 'descriptorExpansion'
            return new strtok.IgnoreType(lenExp)
          } else {
            cb.state = 'header'
            return Structure.Header
          }

        case 'descriptorExpansion':
          cb.state = 'header'
          return Structure.Header

        case 'header':
          this.ape.header = v
          callback('format', 'headerType', this.type)
          callback('format', 'bitsPerSample', v.bitsPerSample)
          callback('format', 'sampleRate', v.sampleRate)
          callback('format', 'numberOfChannels', v.channel)
          callback('format', 'duration', ApeParser.calculateDuration(v))
          let forwardBytes = this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes +
            this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
          cb.state = 'skipData'
          return new strtok.IgnoreType(forwardBytes)

        case 'skipData':
          cb.state = 'tagFooter'
          return Structure.TagFooter

        case 'tagFooter':
          if (v.ID !== 'APETAGEX') {
            done(new Error('Expected footer to start with APETAGEX '))
          }
          this.ape.footer = v
          cb.state = 'tagField'
          return Structure.TagField(v)

        case 'tagField':
          this.parseTags(this.ape.footer, v, callback)
          done()
          break

        default:
          done(new Error('Illegal state: ' + cb.state))
      }
      return 0
    })
  };

  private parseTags(footer: Footer, buffer: Buffer, callback) {
    let offset = 0

    for (let i = 0; i < footer.fields; i++) {
      let size = strtok.UINT32_LE.get(buffer, offset)
      offset += 4
      let flags = Structure.parseTagFlags(strtok.UINT32_LE.get(buffer, offset))
      offset += 4

      let zero = common.findZero(buffer, offset, buffer.length)
      let key = buffer.toString('ascii', offset, zero)
      offset = zero + 1

      switch (flags.dataType) {
        case DataType.text_utf8: { // utf-8 textstring
          let value = buffer.toString('utf8', offset, offset += size)
          let values = value.split(/\x00/g)

          /*jshint loopfunc:true */
          for (let val of values) {
            callback(this.type, key, val)
          }
        }
          break

        case DataType.binary: { // binary (probably artwork)
          if (key === 'Cover Art (Front)' || key === 'Cover Art (Back)') {
            let picData = buffer.slice(offset, offset + size)

            let off = 0
            zero = common.findZero(picData, off, picData.length)
            let description = picData.toString('utf8', off, zero)
            off = zero + 1

            let picture = {
              description,
              data: new Buffer(picData.slice(off))
            }

            offset += size
            callback(this.type, key, picture)
          }
        }
          break

        default:
          throw new Error('Unexpected data-type: ' + flags.dataType)
      }
    }
  }
}

module.exports = ApeParser.getInstance()
