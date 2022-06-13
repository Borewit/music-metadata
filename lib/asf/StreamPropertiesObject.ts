import GUID, {
  StreamPropertiesObject as GUIDStreamPropertiesObject,
} from "./GUID";
import { IAsfObjectHeader } from "./AsfObjectHeader";
import { State } from "./State";

/**
 * Interface for: 3.3 Stream Properties Object (mandatory, one per stream)
 */
export interface IStreamPropertiesObject {
  /**
   * Stream Type
   */
  streamType: string;

  /**
   * Error Correction Type
   */
  errorCorrectionType: GUID;
}

/**
 * Token for: 3.3 Stream Properties Object (mandatory, one per stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_3
 */
export class StreamPropertiesObject extends State<IStreamPropertiesObject> {
  public static guid = GUIDStreamPropertiesObject;

  public constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): IStreamPropertiesObject {
    return {
      streamType: GUID.decodeMediaType(GUID.fromBin(buf, off)),
      errorCorrectionType: GUID.fromBin(buf, off + 8),
      // ToDo
    };
  }
}
