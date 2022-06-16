import GUID, { MetadataLibraryObject } from "./GUID";
import { IAsfObjectHeader } from "./AsfObjectHeader";
import { MetadataObjectState } from "./MetadataObjectState";

// 4.8	Metadata Library Object (optional, 0 or 1)
export class MetadataLibraryObjectState extends MetadataObjectState {
  public static override guid = MetadataLibraryObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }
}
