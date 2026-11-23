import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';

/**
 * RIFF Info Tags; part of the EXIF 2.3
 * Ref: http://owl.phy.queensu.ca/~phil/exiftool/TagNames/RIFF.html#Info
 */
export const riffInfoTagMap: INativeTagMap = {
  IART: 'artist', // Artist
  ICRD: 'date', // DateCreated
  INAM: 'title', // Title
  TITL: 'title',
  IPRD: 'album', // Product
  ITRK: 'trackNumber',
  IPRT: 'trackNumber', // Additional tag for track index
  COMM: 'comments', // Comments
  ICMT: 'comments', // Country
  ICOP: 'copyright',
  ICNT: 'releaseCountry',
  GNRE: 'genres', // Genre
  IWRI: 'writers', // WrittenBy
  RATE: 'rating',
  YEAR: 'year',
  ISFT: 'encodedBy', // Software
  CODE: 'encodedBy', // EncodedBy
  TURL: 'website', // URL,
  IGNR: 'genres', // Genre
  IENG: 'engineers', // Engineer
  ITCH: 'technicians', // Technician
  IMED: 'media', // Original Media
  IRPD: 'album' // Product, where the file was intended for
};

export class RiffInfoTagMapper extends CommonTagMapper {
  public constructor() {
    super(['exif'], riffInfoTagMap);
  }
}
