import {INativeTagMap} from "../tagmap";

/**
 * RIFF Info Tags; part of the EXIF 2.3
 * Ref: http://owl.phy.queensu.ca/~phil/exiftool/TagNames/RIFF.html#Info
 */
export const RiffInfoTagMap: INativeTagMap = {
  IART: 'artist', // Artist
  ICRD: 'date', // DateCreated
  INAM: 'title', // Title
  IPRD: 'album', // Product
  ITRK: 'track'
};
