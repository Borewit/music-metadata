/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * ref: https://xiph.org/flac/format.html#metadata_block
 */
export enum BlockType {
  STREAMINFO = 0,
  PADDING = 1,
  APPLICATION = 2,
  SEEKTABLE = 3,
  VORBIS_COMMENT = 4,
  CUESHEET = 5,
  PICTURE = 6,
}
