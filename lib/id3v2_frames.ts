import * as strtok from 'strtok2'
import common from './common'
import vorbis from './vorbis'

interface IOut {
  language?: string,
  description?: string,
  text?: string,
}

interface IPicture {
  type?: string,
  description?: string
  format?: string,
  data?: Uint8Array
}

export default class FrameParser {

  public static readData(b, type, flags, major) {
    let encoding = FrameParser.getTextEncoding(b[0])
    let length = b.length
    let offset = 0
    let output: any = [] // ToDo
    let nullTerminatorLength = FrameParser.getNullTerminatorLength(encoding)
    let fzero: number
    let out: IOut = {}

    switch (type !== 'TXXX' && type[0] === 'T' ? 'T*' : type) {
      case 'T*': // 4.2.1. Text information frames - details
        let text = common.decodeString(b.slice(1), encoding).replace(/\x00+$/, '')
        // id3v2.4 defines that multiple T* values are separated by 0x00
        output = text.split(/\x00/g)
        break

      case 'TXXX':
        output = FrameParser.readIdentifierAndData(b, offset + 1, length, encoding)
        output = [{
          description: output.id,
          text: common.decodeString(output.data, encoding).replace(/\x00+$/, '')
        }]
        break

      case 'PIC':
      case 'APIC':
        let pic: IPicture = {}

        offset += 1

        switch (major) {
          case 2:
            pic.format = common.decodeString(b.slice(offset, offset + 3), encoding)
            offset += 3
            break
          case 3:
          case 4:
            let enc = 'iso-8859-1'
            fzero = common.findZero(b, offset, length, enc)
            pic.format = common.decodeString(b.slice(offset, fzero), enc)
            offset = fzero + 1
            break

          default:
            throw new Error('Warning: unexpected major version: ' + major)
        }

        pic.type = vorbis.getPictureType(b[offset])
        offset += 1

        fzero = common.findZero(b, offset, length, encoding)
        pic.description = common.decodeString(b.slice(offset, fzero), encoding)
        offset = fzero + nullTerminatorLength

        pic.data = new Buffer(b.slice(offset, length))
        output = [pic]
        break

      case 'CNT':
      case 'PCNT':
        output = [strtok.UINT32_BE.get(b, 0)]
        break

      case 'SYLT':
        // skip text encoding (1 byte),
        //      language (3 bytes),
        //      time stamp format (1 byte),
        //      content headerType (1 byte),
        //      content descriptor (1 byte)
        offset += 7

        output = []
        while (offset < length) {
          let txt = b.slice(offset, offset = common.findZero(b, offset, length, encoding))
          offset += 5 // push offset forward one +  4 byte timestamp
          output.push(common.decodeString(txt, encoding))
        }
        break

      case 'ULT':
      case 'USLT':
      case 'COM':
      case 'COMM':

        offset += 1

        out.language = common.decodeString(b.slice(offset, offset + 3), 'iso-8859-1')
        offset += 3

        fzero = common.findZero(b, offset, length, encoding)
        out.description = common.decodeString(b.slice(offset, fzero), encoding)
        offset = fzero + nullTerminatorLength

        out.text = common.decodeString(b.slice(offset, length), encoding).replace(/\x00+$/, '')

        output = [out]
        break

      case 'UFID':
        output = FrameParser.readIdentifierAndData(b, offset, length, 'iso-8859-1')
        output = [{owner_identifier: output.id, identifier: output.data}]

        break

      case 'PRIV': // private frame
        output = FrameParser.readIdentifierAndData(b, offset, length, 'iso-8859-1')
        output = [{owner_identifier: output.id, data: output.data}]
        break

      default:
        // ToDO? console.log('Warning: unsupported id3v2-frame-type: ' + type)
        break
    }

    return output
  }

  private static readIdentifierAndData(b, offset, length, encoding): {id: string, data: Uint8Array} {
    let fzero = common.findZero(b, offset, length, encoding)

    let id = common.decodeString(b.slice(offset, fzero), encoding)
    offset = fzero + FrameParser.getNullTerminatorLength(encoding)

    return {id, data: b.slice(offset, length)}
  }

  private static getTextEncoding(byte): string {
    switch (byte) {
      case 0x00:
        return 'iso-8859-1' // binary
      case 0x01:
      case 0x02:
        return 'utf16' // 01 = with bom, 02 = without bom
      case 0x03:
        return 'utf8'
      default:
        return 'utf8'
    }
  }

  private static getNullTerminatorLength(enc) {
    switch (enc) {
      case 'utf16':
        return 2
      default:
        return 1
    }
  }

}

// exports.readData = function readData (b, type, flags, major) {
