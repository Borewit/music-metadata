import initDebug from 'debug';
import type { ITokenizer } from 'strtok3';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import { type IOptions, TrackType } from '../../type.js';
import type * as Ogg from '../OggToken.js';
import { IdentificationHeader, type IIdentificationHeader } from './Theora.js';

const debug = initDebug('music-metadata:parser:ogg:theora');

/**
 * Ref:
 * - https://theora.org/doc/Theora.pdf
 */
export class TheoraStream implements Ogg.IPageConsumer {
  private metadata: INativeMetadataCollector;
  public durationOnLastPage = true;
  private identification?: IIdentificationHeader;
  private lastPageHeader?: Ogg.IPageHeader;
  private lastGranulePosition?: number;

  constructor(metadata: INativeMetadataCollector, _options: IOptions, _tokenizer: ITokenizer) {
    this.metadata = metadata;
  }

  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  public async parsePage(header: Ogg.IPageHeader, pageData: Uint8Array): Promise<void> {
    this.lastPageHeader = header;
    if (Number.isSafeInteger(header.absoluteGranulePosition) && header.absoluteGranulePosition >= 0) {
      this.lastGranulePosition = header.absoluteGranulePosition;
    }
    if (header.headerType.firstPage) {
      await this.parseFirstPage(header, pageData);
    }
  }

  public calculateDuration(endOfStream: boolean) {
    const info = this.identification;
    const granule = this.lastGranulePosition;
    if (
      !info ||
      !this.lastPageHeader ||
      !(endOfStream || this.lastPageHeader.headerType.lastPage) ||
      granule === undefined ||
      info.frn <= 0 ||
      info.frd <= 0
    ) {
      return;
    }
    // The granule position packs the key frame and the offset from that key frame.
    // Since Theora 3.2.1 the key frame part is one-based; earlier versions are zero-based.
    const scale = 2 ** info.keyframeGranuleShift;
    const legacy = info.vmaj * 65536 + info.vmin * 256 + info.vrev < 0x030201;
    const frames = Math.floor(granule / scale) + (granule % scale) + Number(legacy);
    if (frames > 0) {
      const duration = (frames * info.frd) / info.frn;
      this.metadata.format.trackInfo[0].duration = duration;
    }
  }

  /**
   * Parse first Theora Ogg page. the initial identification header packet
   */
  protected async parseFirstPage(_header: Ogg.IPageHeader, pageData: Uint8Array): Promise<void> {
    debug('First Ogg/Theora page');
    this.metadata.setFormat('codec', 'Theora');
    const idHeader = IdentificationHeader.get(pageData, 0);
    this.identification = idHeader;
    this.metadata.setFormat('bitrate', idHeader.nombr);
    this.metadata.setFormat('hasVideo', true);
    this.metadata.addStreamInfo({
      type: TrackType.video,
      codecName: 'Theora',
      ...(idHeader.nombr > 0 ? { bitrate: idHeader.nombr } : {}),
      video: {
        pixelWidth: idHeader.vmbw * 16,
        pixelHeight: idHeader.vmbh * 16,
        displayWidth: idHeader.picw,
        displayHeight: idHeader.pich,
        ...(idHeader.frd > 0 && idHeader.frn > 0 ? { frameRate: idHeader.frn / idHeader.frd } : {})
      }
    });
  }

  public flush() {
    return Promise.resolve();
  }
}
