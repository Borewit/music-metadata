import initDebug from 'debug';
import { EndOfStreamError, type ITokenizer, isRandomAccessTokenizer } from 'strtok3';
import * as Token from 'token-types';

import { getMaxMemoryAllocation, getMaxMetadataEntries, readToken } from '../common/Allocation.js';
import { BasicParser } from '../common/BasicParser.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import { createAudioTrackInfo } from '../common/TrackInfo.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import { type IOptions, TrackType } from '../type.js';
import { FlacStream } from './flac/FlacStream.js';
import { crc } from './OggCrc.js';
import { OggStreamMetadata } from './OggStreamMetadata.js';

import type * as Ogg from './OggToken.js';
import { type IPageConsumer, type IPageHeader, PageHeader, SegmentTable } from './OggToken.js';
import { OpusStream } from './opus/OpusStream.js';
import { SpeexStream } from './speex/SpeexStream.js';
import { TheoraStream } from './theora/TheoraStream.js';
import { VorbisStream } from './vorbis/VorbisStream.js';

export class OggContentError extends makeUnexpectedFileContentError('Ogg') {}

const debug = initDebug('music-metadata:parser:ogg');
const maxPageSize = PageHeader.len + 255 + 255 * 255;
const zeroChecksum = new Uint8Array(4);

class OggStream {
  public readonly metadata: OggStreamMetadata;
  public readonly streamSerial: number;
  public lastPageHeader?: IPageHeader;
  public payloadBytes = 0;
  public closed = false;
  private readonly options: IOptions;
  public pageConsumer?: IPageConsumer;
  private isSkeleton = false;

  constructor(metadata: INativeMetadataCollector, streamSerial: number, options: IOptions) {
    this.metadata = new OggStreamMetadata(metadata);
    this.streamSerial = streamSerial;
    this.options = options;
  }

  public async parsePage(tokenizer: ITokenizer, header: IPageHeader, segmentTable?: Ogg.ISegmentTable) {
    debug('serial=%s page#=%s, Ogg.id=%s', header.streamSerialNumber, header.pageSequenceNo, header.capturePattern);

    if (segmentTable) {
      if ((await tokenizer.ignore(header.page_segments)) !== header.page_segments) {
        throw new EndOfStreamError();
      }
    } else {
      segmentTable = await tokenizer.readToken<Ogg.ISegmentTable>(new SegmentTable(header));
    }
    debug('totalPageSize=%s', segmentTable.totalPageSize);
    if (
      !header.headerType.firstPage &&
      this.pageConsumer instanceof OpusStream &&
      this.pageConsumer.isMetadataComplete
    ) {
      // Audio payload is not needed for Opus timing. Ignore works for files,
      // buffers and streams; read the final byte to detect a truncated payload
      // even when a seekable tokenizer's advertised size is stale.
      if (
        tokenizer.fileInfo.size !== undefined &&
        segmentTable.totalPageSize > tokenizer.fileInfo.size - tokenizer.position
      ) {
        throw new EndOfStreamError();
      }
      if (segmentTable.totalPageSize > 0) {
        if ((await tokenizer.ignore(segmentTable.totalPageSize - 1)) !== segmentTable.totalPageSize - 1) {
          throw new EndOfStreamError();
        }
        await tokenizer.readNumber(Token.UINT8);
      }
      this.payloadBytes += segmentTable.totalPageSize;
      this.lastPageHeader = header;
      this.closed ||= header.headerType.lastPage;
      return;
    }
    const pageData = await readToken(tokenizer, new Token.Uint8ArrayType(segmentTable.totalPageSize), this.options);
    this.payloadBytes += pageData.length;
    this.lastPageHeader = header;
    debug(
      'firstPage=%s, lastPage=%s, continued=%s',
      header.headerType.firstPage,
      header.headerType.lastPage,
      header.headerType.continued
    );

    if (header.headerType.firstPage) {
      this.metadata.setFormat('container', 'Ogg');
      const idData = pageData.subarray(0, 7); // Copy this portion
      const asciiId = Array.from(idData)
        .filter(b => b >= 32 && b <= 126) // Keep only printable ASCII
        .map(b => String.fromCharCode(b))
        .join('');
      switch (asciiId) {
        case 'vorbis': // Ogg/Vorbis
          debug(`Set Ogg stream serial ${header.streamSerialNumber}, codec=Vorbis`);
          this.pageConsumer = new VorbisStream(this.metadata, this.options);
          break;
        case 'OpusHea': // Ogg/Opus
          debug('Set page consumer to Ogg/Opus');
          this.pageConsumer = new OpusStream(this.metadata, this.options, tokenizer);
          break;
        case 'Speex  ': // Ogg/Speex
          debug('Set page consumer to Ogg/Speex');
          this.pageConsumer = new SpeexStream(this.metadata, this.options, tokenizer);
          break;
        case 'fishead': // Ogg Skeleton describes other streams; it is not a media codec.
          this.isSkeleton = true;
          break;
        case 'theora': // Ogg/Theora
          debug('Set page consumer to Ogg/Theora');
          this.pageConsumer = new TheoraStream(this.metadata, this.options, tokenizer);
          break;
        case 'FLAC': // Ogg/Theora
          debug('Set page consumer to Vorbis');
          this.pageConsumer = new FlacStream(this.metadata, this.options, tokenizer);
          break;
        default:
          throw new OggContentError(`Ogg codec not recognized (id=${asciiId}`);
      }
    }

    if (header.headerType.lastPage) {
      this.closed = true;
    }

    if (this.isSkeleton) {
      return;
    }

    if (this.pageConsumer) {
      await this.pageConsumer.parsePage(header, pageData, segmentTable.lacingValues);
    } else {
      throw new Error('pageConsumer should be initialized');
    }
  }
}

/**
 * Parser for Ogg logical bitstream framing
 */
export class OggParser extends BasicParser {
  private streams = new Map<number, OggStream>();

  /**
   * Parse page
   * @returns {Promise<void>}
   */
  public async parse(): Promise<void> {
    this.streams = new Map<number, OggStream>();
    const maxLogicalStreams = getMaxMetadataEntries(this.options);
    let endOfStream = false;
    let stoppedEarly = false;
    let tailLookupAttempted = false;
    let opusTailHeader: IPageHeader | undefined;
    // Coalesce the fixed header and its lacing table into one I/O operation.
    // A peek retains any following payload bytes for sequential tokenizers.
    const headerBuffer =
      getMaxMemoryAllocation(this.options) >= PageHeader.len + 255 ? new Uint8Array(PageHeader.len + 255) : undefined;

    try {
      do {
        const { header, segmentTable } = await this.readPageHeader(headerBuffer);

        let stream = this.streams.get(header.streamSerialNumber);
        if (!stream) {
          if (this.streams.size >= maxLogicalStreams) {
            throw new OggContentError('Logical stream count exceeds entry limit');
          }
          stream = new OggStream(this.metadata, header.streamSerialNumber, this.options);
          this.streams.set(header.streamSerialNumber, stream);
        }
        const metadataWasComplete = stream.pageConsumer?.isMetadataComplete;
        await stream.parsePage(this.tokenizer, header, segmentTable);

        if (
          this.options.duration &&
          !tailLookupAttempted &&
          this.streams.size === 1 &&
          !stream.closed &&
          stream.pageConsumer instanceof OpusStream &&
          stream.pageConsumer.isMetadataComplete
        ) {
          tailLookupAttempted = true;
          const tail = await this.peekOpusTail(header);
          if (tail) {
            opusTailHeader = tail.header;
            stream.payloadBytes += tail.payloadBytes;
            stream.closed = true;
            stoppedEarly = true;
            break;
          }
        }

        if (
          header.pageSequenceNo > 12 &&
          !(stream.pageConsumer instanceof OpusStream && metadataWasComplete === false) &&
          // A comment (including its cover art) may span more than 13 pages.
          [...this.streams.values()].every(stream => stream.pageConsumer?.isMetadataComplete !== false) &&
          // Without a validated tail, duration requires reaching the last page.
          !(this.options.duration && [...this.streams.values()].some(stream => stream.pageConsumer?.durationOnLastPage))
        ) {
          stoppedEarly = true;
          debug('Stop processing Ogg stream');
          break;
        }
      } while (![...this.streams.values()].every(item => item.closed));
    } catch (err) {
      if (err instanceof EndOfStreamError) {
        debug('Reached end-of-stream');
        endOfStream = true;
      } else if (err instanceof OggContentError) {
        this.metadata.addWarning(`Corrupt Ogg content at ${this.tokenizer.position}`);
      } else {
        throw err;
      }
    }
    for (const stream of this.streams.values()) {
      if (!stream.closed) {
        if (!stoppedEarly) {
          this.metadata.addWarning(
            `End-of-stream reached before reaching last page in Ogg stream serial=${stream.streamSerial}`
          );
        }
        await stream.pageConsumer?.flush();
      }
      if (stream.pageConsumer instanceof OpusStream) {
        stream.pageConsumer.calculateDuration(endOfStream, opusTailHeader ?? stream.lastPageHeader);
      } else {
        stream.pageConsumer?.calculateDuration(endOfStream);
      }
      const format = stream.metadata.format;
      if (format.hasAudio) {
        const track = createAudioTrackInfo(format);
        track.id = stream.streamSerial;
        // The summary's Opus estimate uses the file size. Count only this stream's
        // payload to keep the track bitrate independent of framing and other streams.
        if (format.codec === 'Opus') {
          delete track.bitrate;
          if (track.duration && track.duration > 0 && stream.closed) {
            track.bitrate = (stream.payloadBytes * 8) / track.duration;
          }
        }
        if (format.codec === 'Opus' && track.audio) {
          track.audio.outputSamplingFrequency = 48000;
        }
        this.metadata.addStreamInfo(track);
      } else if (format.hasVideo) {
        const track = format.trackInfo[0] ?? { type: TrackType.video, codecName: format.codec };
        track.id = stream.streamSerial;
        if (track.duration && track.duration > 0 && (stream.closed || endOfStream)) {
          track.bitrate = (stream.payloadBytes * 8) / track.duration;
        }
        this.metadata.addStreamInfo(track);
      }
    }
    // Absence can only be determined after discovering the logical streams.
    for (const flag of ['hasAudio', 'hasVideo'] as const) {
      const present = [...this.streams.values()].some(stream => stream.metadata.format[flag] === true);
      if (this.metadata.format[flag] !== present) {
        this.metadata.setFormat(flag, present);
      }
    }
  }

  private async readPageHeader(
    buffer?: Uint8Array
  ): Promise<{ header: IPageHeader; segmentTable?: Ogg.ISegmentTable }> {
    if (!isRandomAccessTokenizer(this.tokenizer)) {
      buffer = undefined;
    }
    const bytesRead = buffer ? await this.tokenizer.peekBuffer(buffer, { mayBeLess: true }) : 0;
    if (buffer && bytesRead < PageHeader.len) {
      throw new EndOfStreamError();
    }
    const header = buffer ? PageHeader.get(buffer, 0) : await this.tokenizer.readToken(PageHeader);
    if (buffer) {
      if ((await this.tokenizer.ignore(PageHeader.len)) !== PageHeader.len) {
        throw new EndOfStreamError();
      }
    }
    if (header.capturePattern !== 'OggS') {
      throw new OggContentError('Invalid Ogg capture pattern');
    }
    if (!buffer) {
      return { header };
    }
    const table = new SegmentTable(header);
    if (bytesRead < PageHeader.len + table.len) {
      // Let the stream's regular table read report truncation, preserving the
      // logical stream and its diagnostics even when its first page is short.
      return { header };
    }
    return { header, segmentTable: table.get(buffer, PageHeader.len) };
  }

  /** Peek without committing the cursor, so an invalid tail can fall back to page scanning. */
  private async peekOpusTail(
    currentHeader: IPageHeader
  ): Promise<{ header: IPageHeader; payloadBytes: number } | undefined> {
    const fileSize = this.tokenizer.fileInfo.size;
    // Include any enclosing page header, not just a forged header in its payload.
    // If that does not fit the allocation limit, scan pages sequentially instead.
    const scanSize = maxPageSize;
    if (
      fileSize === undefined ||
      fileSize - this.tokenizer.position <= scanSize ||
      scanSize > getMaxMemoryAllocation(this.options) ||
      !isRandomAccessTokenizer(this.tokenizer)
    ) {
      return;
    }
    const buffer = new Uint8Array(scanSize);
    try {
      if ((await this.tokenizer.peekBuffer(buffer, { position: fileSize - scanSize, mayBeLess: true })) !== scanSize) {
        return;
      }
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        return;
      }
      throw error;
    }
    // Scan forwards: a real page must win over a forged page inside its payload.
    for (
      let offset = buffer.indexOf(0x4f);
      offset >= 0 && offset <= buffer.length - PageHeader.len;
      offset = buffer.indexOf(0x4f, offset + 1)
    ) {
      if (buffer[offset + 1] !== 0x67 || buffer[offset + 2] !== 0x67 || buffer[offset + 3] !== 0x53) {
        continue;
      }
      const header = PageHeader.get(buffer, offset);
      const payloadOffset = offset + PageHeader.len + header.page_segments;
      if (payloadOffset > buffer.length) {
        continue;
      }
      let pageEnd = payloadOffset;
      for (let index = offset + PageHeader.len; index < payloadOffset; ++index) {
        pageEnd += buffer[index];
      }
      if (pageEnd !== buffer.length) {
        continue;
      }
      // Reject the enclosing EOF-sized page without accepting an embedded page
      // later in its payload, even if that embedded page has a valid checksum.
      if (
        header.version !== 0 ||
        (buffer[offset + 5] & ~1) !== 4 ||
        header.streamSerialNumber !== currentHeader.streamSerialNumber ||
        header.pageSequenceNo <= currentHeader.pageSequenceNo ||
        !Number.isSafeInteger(header.absoluteGranulePosition) ||
        header.absoluteGranulePosition < Math.max(0, currentHeader.absoluteGranulePosition)
      ) {
        return;
      }
      let checksum = crc(buffer.subarray(offset, offset + 22));
      checksum = crc(zeroChecksum, checksum);
      if (crc(buffer.subarray(offset + 26, pageEnd), checksum) === header.pageChecksum) {
        // A logical stream ends at its first EOS page. Reject a later tail page
        // when an earlier same-serial EOS exists, even outside the tail window.
        const scan = await this.scanOpusTail(currentHeader, fileSize - scanSize + offset);
        if (!scan || header.absoluteGranulePosition < scan.granule) {
          return;
        }
        const candidate = buffer.slice(offset, pageEnd);
        try {
          if (
            (await this.tokenizer.peekBuffer(buffer, {
              position: fileSize - scanSize + offset,
              length: candidate.length,
              mayBeLess: true
            })) !== candidate.length ||
            !candidate.every((byte, index) => byte === buffer[index])
          ) {
            return;
          }
        } catch (error) {
          if (error instanceof EndOfStreamError) {
            return;
          }
          throw error;
        }
        return { header, payloadBytes: scan.payloadBytes + pageEnd - payloadOffset };
      }
      return;
    }
  }

  /** Validate intervening pages and collect their payload sizes and latest completed granule. */
  private async scanOpusTail(
    currentHeader: IPageHeader,
    tailOffset: number
  ): Promise<{ payloadBytes: number; granule: number } | undefined> {
    const start = this.tokenizer.position;
    let payloadBytes = 0;
    let granule = Math.max(0, currentHeader.absoluteGranulePosition);
    const scanSize = maxPageSize;
    const buffer = new Uint8Array(scanSize);
    let bufferStart = start;
    let bufferLength = 0;
    let scanPosition = start;
    try {
      while (scanPosition < tailOffset) {
        if (scanPosition + PageHeader.len > bufferStart + bufferLength) {
          bufferStart = scanPosition;
          bufferLength = await this.tokenizer.peekBuffer(buffer, {
            position: bufferStart,
            length: Math.min(scanSize, tailOffset - bufferStart),
            mayBeLess: true
          });
          if (bufferLength < PageHeader.len) {
            return;
          }
        }
        let offset = scanPosition - bufferStart;
        if (
          buffer[offset] !== 0x4f ||
          buffer[offset + 1] !== 0x67 ||
          buffer[offset + 2] !== 0x67 ||
          buffer[offset + 3] !== 0x53
        ) {
          return;
        }
        let header = PageHeader.get(buffer, offset);
        if (offset + PageHeader.len + header.page_segments > bufferLength) {
          // The lacing table crosses the chunk boundary; refill from this page.
          bufferStart = scanPosition;
          bufferLength = await this.tokenizer.peekBuffer(buffer, {
            position: bufferStart,
            length: Math.min(scanSize, tailOffset - bufferStart),
            mayBeLess: true
          });
          if (bufferLength < PageHeader.len) {
            return;
          }
          offset = 0;
          if (
            buffer[offset] !== 0x4f ||
            buffer[offset + 1] !== 0x67 ||
            buffer[offset + 2] !== 0x67 ||
            buffer[offset + 3] !== 0x53
          ) {
            return;
          }
          header = PageHeader.get(buffer, offset);
        }
        const tableEnd = offset + PageHeader.len + header.page_segments;
        if (tableEnd > bufferLength) {
          return;
        }
        let payloadLength = 0;
        for (let index = offset + PageHeader.len; index < offset + PageHeader.len + header.page_segments; ++index) {
          payloadLength += buffer[index];
        }
        const pageLength = PageHeader.len + header.page_segments + payloadLength;
        if (scanPosition + pageLength > tailOffset) {
          return;
        }
        if (
          header.streamSerialNumber !== currentHeader.streamSerialNumber ||
          header.headerType.lastPage ||
          header.headerType.firstPage
        ) {
          return;
        }
        payloadBytes += payloadLength;
        if (header.absoluteGranulePosition >= 0) {
          granule = header.absoluteGranulePosition;
        }
        scanPosition += pageLength;
      }
    } catch {
      // A scan failure cannot establish that the tail page is the only EOS.
      return;
    } finally {
      const tokenizer = this.tokenizer;
      if (isRandomAccessTokenizer(tokenizer)) {
        tokenizer.setPosition(start);
      }
    }
    return { payloadBytes, granule };
  }
}
