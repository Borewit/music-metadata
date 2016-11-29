import * as equal from 'deep-equal'
import windows1252decoder from './windows1252decoder'

export default class Common {

  // ToDo: move to ASF
  public static asfGuidBuf = new Buffer([
    0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
    0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
  ])

  public static strtokUINT24_BE = {
    get: (buf, off): number => {
      return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2]
    },
    len: 3
  }

  public static strtokBITSET = {
    get: (buf, off, bit): boolean => {
      return (buf[off] & (1 << bit)) !== 0
    },
    len: 1
  }

  public static strtokINT32SYNCSAFE = {
    get: (buf, off): number => {
      return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
        ((buf[off + 1]) << 14) | ((buf[off]) << 21)
    },
    len: 4
  }

  public static strtokUINT32_LE = {
    len : 4,
    get :(buf, off) => {
      // Shifting the MSB by 24 directly causes it to go negative if its
      // last bit is high, so we instead shift by 23 and multiply by 2.
      // Also, using binary OR to count the MSB if its last bit is high
      // causes the value to go negative. Use addition there.
      return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16)) +
        ((buf[off + 3] << 23) * 2)
    }
  }

  public static GENRES = [
    'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop',
    'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock',
    'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack',
    'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance',
    'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
    'Alt. Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop',
    'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial',
    'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult',
    'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American',
    'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
    'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
    'Folk', 'Folk/Rock', 'National Folk', 'Swing', 'Fast-Fusion', 'Bebob', 'Latin', 'Revival',
    'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock',
    'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic', 'Humour',
    'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus',
    'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore',
    'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet', 'Punk Rock', 'Drum Solo',
    'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House',
    'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk', 'Polsk Punk', 'Beat',
    'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover', 'Contemporary Christian',
    'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop',
    'Abstract', 'Art Rock', 'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout',
    'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro', 'Electroclash', 'Emo', 'Experimental',
    'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock',
    'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock',
    'Psytrance', 'Shoegaze', 'Space Rock', 'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook',
    'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
    'Garage Rock', 'Psybient'
  ]

  public static getParserForMediaType(types, header) {
    for (let type of types) {
      let offset = type.offset || 0
      if (header.length >= offset + type.buf.length &&
        equal(header.slice(offset, offset + type.buf.length), type.buf)) {
        return type.tag
      }
    }
    // default to id3v1.1 if we cannot detect any other tags
    return require('./id3v1')
  }

  public static streamOnRealEnd(stream: NodeJS.ReadableStream, callback: () => void): void {
    stream.on('end', done)
    stream.on('close', done)
    function done() {
      stream.removeListener('end', done)
      stream.removeListener('close', done)
      callback()
    }
  }

  public static removeUnsyncBytes(buffer: Buffer): Uint8Array {
    let readI = 0
    let writeI = 0
    while (readI < buffer.length - 1) {
      if (readI !== writeI) {
        buffer[writeI] = buffer[readI]
      }
      readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1
      writeI++
    }
    if (readI < buffer.length) {
      buffer[writeI++] = buffer[readI++]
    }
    return buffer.slice(0, writeI)
  }

  /**
   *
   * @param buffer
   * @param start
   * @param end
   * @param encoding // ToDo: ts.enum
   * @return {number}
   */
  public static findZero(buffer: Buffer, start: number, end: number, encoding?: string): number {
    let i = start
    if (encoding === 'utf16') {
      while (buffer[i] !== 0 || buffer[i + 1] !== 0) {
        if (i >= end) return end
        i += 2
      }
      return i
    } else {
      while (buffer[i] !== 0) {
        if (i >= end) return end
        i++
      }
      return i
    }
  }

  public static sum(arr: number[]): number {
    let s: number = 0
    for (let v of arr) {
      s += v
    }
    return s
  }

  public static swapBytes(buffer: Buffer): Buffer {
    let l = buffer.length
    if (l & 0x01) {
      throw new Error('Buffer length must be even')
    }
    for (let i = 0; i < l; i += 2) {
      let a = buffer[i]
      buffer[i] = buffer[i + 1]
      buffer[i + 1] = a
    }
    return buffer
  }

  public static readUTF16String(buffer: Buffer): string {
    let offset = 0
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) { // big endian
      buffer = Common.swapBytes(buffer)
      offset = 2
    } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
      offset = 2
    }
    return buffer.toString('ucs2', offset)
  }

  /**
   *
   * @param buffer
   * @param encoding ToDo
   * @return {string}
   */
  public static decodeString(buffer: Buffer, encoding: string): string {
    // annoying workaround for a double BOM issue
    // https://github.com/leetreveil/musicmetadata/issues/84
    if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0xFE && buffer[3] === 0xFF) {
      buffer = buffer.slice(2)
    }

    if (encoding === 'utf16le' || encoding === 'utf16') {
      return Common.readUTF16String(buffer)
    } else if (encoding === 'utf8') {
      return buffer.toString('utf8')
    } else if (encoding === 'iso-8859-1') {
      return windows1252decoder(buffer)
    }

    throw Error(encoding + ' encoding is not supported!')
  }

  public static parseGenre(origVal) {
    // match everything inside parentheses
    let split = origVal.trim().split(/\((.*?)\)/g).filter( (val) => {
        return val !== ''
      })

    let array = []
    for (let cur of split) {
      if (/^\d+$/.test(cur) && !isNaN(parseInt(cur, 10))) {
        cur = Common.GENRES[cur]
      }
      array.push(cur)
    }

    return array
      .filter( (val) => {
        return val !== undefined
      }).join('/')
  }

  public static stripNulls(str: string): string {
    str = str.replace(/^\x00+/g, '')
    str = str.replace(/\x00+$/g, '')
    return str
  }

  /**
   * Read bit-aligned number start from buffer
   * @param buf Byte buffer
   * @param off Starting offset in bits
   * @param len Length of number in bits
   * @return {number} decoded bit aligned number
   */
  public static getBitAllignedNumber(buf: Buffer, off: number, len: number): number {
    let byteOff = ~~(off / 8)
    let bitOff = off % 8
    let value = buf[byteOff]
    value &= 0xff >> bitOff
    let bitsRead = 8 - bitOff
    let bitsLeft = len - bitsRead
    if (bitsLeft < 0) {
      value >>= (8 - bitOff - len)
    } else if (bitsLeft > 0) {
      value <<= bitsLeft
      value |= Common.getBitAllignedNumber(buf, off + bitsRead, bitsLeft)
    }
    return value
  }
}
