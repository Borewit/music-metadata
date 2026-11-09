import { encodeBase64 } from '../../common/Base64.js';
import { concatBytes, decodeAscii } from '../core/bytes.js';
import { InvalidFileError, UnsupportedFeatureError } from '../core/errors.js';
import { validatePictures } from '../core/patch.js';
import type { ByteSource } from '../core/source.js';
import type { TagPatch, WriteOptions } from '../core/types.js';
import type { WriteChunk } from '../core/writer.js';
import { serializePicture } from '../flac/picture.js';
import { applyVorbisPatch } from '../mapping/vorbis.js';
import { parseVorbisCommentWithSuffix, serializeVorbisComment } from '../vorbis/comment.js';

// Match the MP4 parser's 100,000-entry budget. This caps retained page
// headers and source-range descriptors for buffer, file, and dry-run updates.
const MAX_PAGES = 100_000;
const MAX_HEADER_PACKET = 64 * 1024 * 1024;
const CRC_POLYNOMIAL = 0x04c11db7;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index << 24;
    for (let bit = 0; bit < 8; bit++) {
      value = (value << 1) ^ (value & 0x80000000 ? CRC_POLYNOMIAL : 0);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

/** Compute the Ogg CRC-32 over a complete page. */
export function crc(data: Uint8Array): number {
  let value = 0;
  for (const byte of data) {
    value = ((value << 8) ^ CRC_TABLE[((value >>> 24) ^ byte) & 0xff]) >>> 0;
  }
  return value;
}

function checkPageCount(count: number): void {
  if (count >= MAX_PAGES) {
    throw new UnsupportedFeatureError('Ogg page count exceeds limit of 100000');
  }
}

export interface OggUpdate {
  chunks: WriteChunk[];
  paddingBytes: number;
}

export async function buildOggUpdate(
  source: ByteSource,
  patch: TagPatch,
  options: WriteOptions = {}
): Promise<OggUpdate> {
  if (options.padding !== undefined || options.replaceId3 || options.stripFlacId3) {
    throw new UnsupportedFeatureError('Ogg does not support padding or ID3 options');
  }
  const chunks: WriteChunk[] = [];
  let offset = 0;
  let serial: number | undefined;
  let expectedSequence = 0;
  let outputSequence = 0;
  let packetIndex = 0;
  let opus = false;
  let headerCount = 3;
  let pending: Uint8Array[] = [];
  let pendingSize = 0;
  let continued = false;
  let audioPages = 0;
  let ended = false;
  while (offset < source.size) {
    checkPageCount(expectedSequence);
    if (ended) {
      throw new UnsupportedFeatureError('Chained or multiplexed Ogg streams are not supported');
    }
    if (offset + 27 > source.size) {
      throw new InvalidFileError('Truncated Ogg header');
    }
    const header = await source.read(offset, 27);
    if (decodeAscii(header.subarray(0, 4)) !== 'OggS' || header[4] !== 0 || (header[5] & ~7) !== 0) {
      throw new InvalidFileError('Invalid Ogg header');
    }
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const pageSerial = view.getUint32(14, true);
    if (serial !== undefined && pageSerial !== serial) {
      throw new UnsupportedFeatureError('Multiplexed Ogg streams are not supported');
    }
    serial = pageSerial;
    const pageSequence = view.getUint32(18, true);
    const isBos = Boolean(header[5] & 2);
    const isContinued = Boolean(header[5] & 1);
    // RFC 7845 §3 allows the first audio page to continue a packet from
    // before the headers, e.g. when headers were pasted onto a live stream.
    const allowsJoiningContinuation = packetIndex >= headerCount && audioPages === 0;
    if (
      pageSequence !== expectedSequence ||
      isBos !== (expectedSequence === 0) ||
      (isContinued !== continued && !(allowsJoiningContinuation && isContinued))
    ) {
      throw new InvalidFileError('Invalid Ogg page sequence or continuation');
    }
    expectedSequence++;
    const laces = await source.read(offset + 27, header[26]);
    const size = laces.reduce((a, b) => a + b, 0);
    if (offset + 27 + laces.length + size > source.size) {
      throw new InvalidFileError('Truncated Ogg page');
    }
    const body = await source.read(offset + 27 + laces.length, size);
    const page = concatBytes(header, laces, body);
    const expectedCrc = view.getUint32(22, true);
    page.fill(0, 22, 26);
    if (crc(page) !== expectedCrc) {
      throw new InvalidFileError('Invalid Ogg checksum');
    }
    if (packetIndex >= headerCount) {
      // Keep audio pagination and granule positions exactly as supplied.
      const pageView = new DataView(page.buffer, page.byteOffset, page.byteLength);
      checkPageCount(outputSequence);
      pageView.setUint32(18, outputSequence++, true);
      pageView.setUint32(22, crc(page), true);
      chunks.push(page.slice(0, 27 + laces.length), { source, offset: offset + 27 + laces.length, length: size });
      // Empty pages cannot complete a packet started on an earlier page.
      continued = laces.length > 0 ? laces[laces.length - 1] === 255 : isContinued;
      audioPages++;
    } else {
      let position = 0;
      for (let i = 0; i < laces.length; i++) {
        const length = laces[i];
        pending.push(body.subarray(position, position + length));
        pendingSize += length;
        if (pendingSize > MAX_HEADER_PACKET) {
          throw new UnsupportedFeatureError('Ogg header packet exceeds 64 MiB');
        }
        position += length;
        if (length === 255) {
          continue;
        }
        // A header can contain hundreds of thousands of laces. Avoid a
        // variadic call, whose argument limit is much lower than 64 MiB.
        let packet: Uint8Array = new Uint8Array(pendingSize);
        let packetOffset = 0;
        for (const fragment of pending) {
          packet.set(fragment, packetOffset);
          packetOffset += fragment.length;
        }
        pending = [];
        pendingSize = 0;
        if (packetIndex === 0) {
          opus = decodeAscii(packet.subarray(0, 8)) === 'OpusHead';
          headerCount = opus ? 2 : 3;
        }
        if (opus) {
          if (decodeAscii(packet.subarray(0, 8)) !== (packetIndex === 0 ? 'OpusHead' : 'OpusTags')) {
            throw new InvalidFileError('Invalid Opus header');
          }
          if (
            packetIndex === 0 &&
            (packet.length < 19 ||
              packet[8] > 15 ||
              packet[9] === 0 ||
              (packet[18] !== 0 && packet.length < 21 + packet[9]))
          ) {
            throw new InvalidFileError('Invalid Opus identification header');
          }
          if (i !== laces.length - 1) {
            throw new UnsupportedFeatureError('Shared Opus header/audio pages are not supported');
          }
        } else if (packet[0] !== [1, 3, 5][packetIndex] || decodeAscii(packet.subarray(1, 7)) !== 'vorbis') {
          throw new UnsupportedFeatureError('Expected Ogg Vorbis or Opus headers');
        } else if (packetIndex === 0 && packet.length < 30) {
          throw new InvalidFileError('Invalid Vorbis identification header');
        }
        if (packetIndex === 1) {
          const pictures = validatePictures(patch.picture);
          const pictureComments =
            pictures?.map(picture => ({
              key: 'METADATA_BLOCK_PICTURE',
              value: encodeBase64(serializePicture(picture))
            })) ?? [];
          const prefixLength = opus ? 8 : 7;
          const parsed = parseVorbisCommentWithSuffix(packet.subarray(prefixLength));
          // The Vorbis framing bit immediately follows the counted comments,
          // not any optional trailing padding. Only its low bit is defined.
          if (!opus && (!parsed.suffix.length || !(parsed.suffix[0] & 1))) {
            throw new InvalidFileError('Missing Vorbis comment framing bit');
          }
          const fields = applyVorbisPatch(parsed, patch, { pictureComments });
          const comments = serializeVorbisComment(fields);
          if (prefixLength + comments.length + parsed.suffix.length > MAX_HEADER_PACKET) {
            throw new UnsupportedFeatureError('Ogg header packet exceeds 64 MiB');
          }
          packet = concatBytes(packet.subarray(0, prefixLength), comments, parsed.suffix);
        }
        if (packetIndex === 2 && i !== laces.length - 1) {
          throw new UnsupportedFeatureError('Shared setup/audio pages are not supported');
        }
        let start = 0;
        const segments = [...new Array(Math.floor(packet.length / 255)).fill(255), packet.length % 255];
        for (let n = 0; n < segments.length; n += 255) {
          checkPageCount(outputSequence);
          const table = Uint8Array.from(segments.slice(n, n + 255));
          const count = table.reduce((a, b) => a + b, 0);
          const h = new Uint8Array(27);
          h.set([79, 103, 103, 83]);
          h[5] = (n ? 1 : 0) | (packetIndex === 0 && n === 0 ? 2 : 0);
          // An EOS header page may contain several packets, and rewriting
          // comments may add pages. Only the final generated page ends it.
          if ((header[5] & 4) !== 0 && i === laces.length - 1 && n + 255 >= segments.length) {
            h[5] |= 4;
          }
          if (n + 255 < segments.length) {
            h.fill(255, 6, 14);
          }
          const v = new DataView(h.buffer);
          v.setUint32(14, serial, true);
          v.setUint32(18, outputSequence++, true);
          h[26] = table.length;
          const out = concatBytes(h, table, packet.subarray(start, start + count));
          new DataView(out.buffer, out.byteOffset, out.byteLength).setUint32(22, crc(out), true);
          chunks.push(out);
          start += count;
        }
        packetIndex++;
      }
      continued = pending.length > 0;
    }
    ended = Boolean(header[5] & 4);
    offset += page.length;
  }
  if (!ended || continued || packetIndex < headerCount) {
    throw new InvalidFileError('Incomplete Ogg stream');
  }
  return { chunks, paddingBytes: 0 };
}
