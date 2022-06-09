import {INativeTagMap} from '../common/GenericTagTypes';
import {CommonTagMapper} from '../common/GenericTagMapper';

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
  ITRK: 'track',
  COMM: 'comment', // Comments
  ICMT: 'comment', // Country
  ICNT: 'releasecountry',
  GNRE: 'genre', // Genre
  IWRI: 'writer', // WrittenBy
  RATE: 'rating',
  YEAR: 'year',
  ISFT: 'encodedby', // Software
  CODE: 'encodedby', // EncodedBy
  TURL: 'website', // URL,
  IGNR: 'genre', // Genre
  IENG: 'engineer', // Engineer
  ITCH:	'technician', // Technician
  IMED: 'media', // Original Media
  IRPD: 'album' // Product, where the file was intended for
};

export class RiffInfoTagMapper extends CommonTagMapper {

  public constructor() {
    super(['exif'], riffInfoTagMap);
  }
}
