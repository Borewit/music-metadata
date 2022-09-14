import { FourCcToken } from "../common/FourCC";
import { getBit } from "../common/Util";
import { UINT8, UINT64_LE, UINT32_LE } from "../token-types";

import type { IGetToken } from "../strtok3";


/**
 * Page header
 * Ref: https://www.xiph.org/ogg/doc/framing.html#page_header
 */
export interface IPageHeader {
  /**
   * capture_pattern
   * A header begins with a capture pattern that simplifies identifying pages;
   * once the decoder has found the capture pattern it can do a more intensive job of verifying that it has in fact found a page boundary (as opposed to an inadvertent coincidence in the byte stream).
   */
  capturePattern: string;
  /**
   * stream_structure_version
   */
  version: number;
  /**
   * header_type_flag
   */
  headerType: {
    /**
     * True: continued packet;
     * False: fresh packet
     */
    continued: boolean;

    /**
     * True: first page of logical bitstream (bos)
     * False: not first page of logical bitstream
     */
    firstPage: boolean;

    /**
     * True: last page of logical bitstream (eos)
     * False: not last page of logical bitstream
     */
    lastPage: boolean;
  };
  /**
   * The total samples encoded after including all packets finished on this page
   * The position specified in the frame header of the last page tells how long the data coded by the bitstream is.
   */
  absoluteGranulePosition: number;
  streamSerialNumber: number;
  pageSequenceNo: number;
  pageChecksum: number;
  /**
   * The number of segment entries to appear in the segment table.
   * The maximum number of 255 segments (255 bytes each) sets the maximum possible physical page size at 65307 bytes or
   * just under 64kB (thus we know that a header corrupted so as destroy sizing/alignment information will not cause a
   * runaway bitstream. We'll read in the page according to the corrupted size information that's guaranteed to be a
   * reasonable size regardless, notice the checksum mismatch, drop sync and then look for recapture).
   */
  page_segments: number;
}

export const Header: IGetToken<IPageHeader> = {
  len: 27,

  get: (buf, off): IPageHeader => {
    return {
      capturePattern: FourCcToken.get(buf, off),
      version: UINT8.get(buf, off + 4),

      headerType: {
        continued: getBit(buf, off + 5, 0),
        firstPage: getBit(buf, off + 5, 1),
        lastPage: getBit(buf, off + 5, 2),
      },
      // packet_flag: buf.readUInt8(off + 5),
      absoluteGranulePosition: Number(UINT64_LE.get(buf, off + 6)),
      streamSerialNumber: UINT32_LE.get(buf, off + 14),
      pageSequenceNo: UINT32_LE.get(buf, off + 18),
      pageChecksum: UINT32_LE.get(buf, off + 22),
      page_segments: UINT8.get(buf, off + 26),
    };
  },
};
