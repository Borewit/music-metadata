/**
 * Page header
 * Ref: https://www.xiph.org/ogg/doc/framing.html#page_header
 */

import {INativeAudioMetadata} from "../index";

export interface IPageHeader {
  /**
   * capture_pattern
   * A header begins with a capture pattern that simplifies identifying pages;
   * once the decoder has found the capture pattern it can do a more intensive job of verifying that it has in fact found a page boundary (as opposed to an inadvertent coincidence in the byte stream).
   */
  capturePattern: string,
  /**
   * stream_structure_version
   */
  version: number,
  /**
   * header_type_flag
   */
  headerType: {
    /**
     * True: continued packet;
     * False: fresh packet
     */
    continued: boolean,

    /**
     * True: first page of logical bitstream (bos)
     * False: not first page of logical bitstream
     */
    firstPage: boolean,

    /**
     * True: last page of logical bitstream (eos)
     * False: not last page of logical bitstream
     */
    lastPage: boolean
  },
  /**
   * The total samples encoded after including all packets finished on this page
   * The position specified in the frame header of the last page tells how long the data coded by the bitstream is.
   */
  absoluteGranulePosition: number,
  streamSerialNumber: number,
  pageSequenceNo: number,
  pageChecksum: number,
  segmentTable: number;
}

export interface IPageConsumer {

  /**
   * Parse Ogg page
   * @param {IPageHeader} header Ogg page header
   * @param {Buffer} pageData Ogg page data
   */
  parsePage(header: IPageHeader, pageData: Buffer);
}

export interface IAudioParser extends IPageConsumer {

  getMetadata(): INativeAudioMetadata
}
