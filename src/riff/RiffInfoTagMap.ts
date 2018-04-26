import {INativeTagMap} from "../common/GenericTagTypes";
import {CommonTagMapper} from "../common/GenericTagMapper";

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
  RATE: '_rating',
  YEAR: 'year',
  ISFT: 'encodedby', // Software
  CODE: 'encodedby', // EncodedBy
  TURL: 'website' // URL
  // ITCH:	'technician' //Technician
};

export class RiffInfoTagMapper extends CommonTagMapper {

  public constructor() {
    super(['exif'], riffInfoTagMap);
  }
}
