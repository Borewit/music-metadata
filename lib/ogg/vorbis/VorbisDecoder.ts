import { defaultMaxMetadataEntries } from '../../common/Allocation.js';
import { makeUnexpectedFileContentError } from '../../ParseError.js';
import { type ParsedVorbisComment, VorbisDecoder as SharedVorbisDecoder } from '../../tokens/vorbis.js';

class VorbisCommentError extends makeUnexpectedFileContentError('Vorbis') {}

type ErrorFactory = (message: string) => Error;

/**
 * Vorbis Comment decoder used by the reader.
 *
 * The shared decoder preserves the original key spelling; this boundary
 * uppercases keys to keep `music-metadata`'s native-tag behavior unchanged.
 */
export class VorbisDecoder extends SharedVorbisDecoder {
  public constructor(data: Uint8Array, offset = 0, options: { maxComments?: number } = {}) {
    super(data, offset, {
      createError: message => new VorbisCommentError(message),
      maxComments: options.maxComments ?? defaultMaxMetadataEntries
    });
  }

  public override parseUserComment(): ParsedVorbisComment {
    const tag = super.parseUserComment();
    return { ...tag, key: tag.key.toUpperCase() };
  }

  public override parseCommentList(
    createCountError?: ErrorFactory,
    maxComments?: number
  ): { vendor: string; comments: IterableIterator<ParsedVorbisComment> } {
    return super.parseCommentList(createCountError, maxComments);
  }
}
