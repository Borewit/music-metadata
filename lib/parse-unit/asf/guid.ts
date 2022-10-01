import { toFixedHexString, toHexString } from "../../compat/hex";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { bytes } from "../primitive/bytes";
import { u16be, u16le, u32le } from "../primitive/integer";

/**
 * Ref:
 * - https://tools.ietf.org/html/draft-fleischman-asf-01, Appendix A: ASF GUIDs
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 *
 * ASF File Structure:
 * - https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 *
 * ASF GUIDs:
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 * - https://github.com/dji-sdk/FFmpeg/blob/master/libavformat/asf.c
 */
export class GUID {
  constructor(public str: string) {}
}

/**
 * Decode GUID in format like "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
 */
export const guid = map(sequence(u32le, u16le, u16le, u16be, bytes(6)), ([data1, data2, data3, data4a, data4b]) => {
  return new GUID(
    [
      toFixedHexString(data1, 8),
      toFixedHexString(data2, 4),
      toFixedHexString(data3, 4),
      toFixedHexString(data4a, 4),
      toHexString(data4b),
    ]
      .join("-")
      .toUpperCase()
  );
});

// 10.1 Top-level ASF object GUIDs
export const HeaderObject = new GUID("75B22630-668E-11CF-A6D9-00AA0062CE6C");
export const DataObject = new GUID("75B22636-668E-11CF-A6D9-00AA0062CE6C");
export const SimpleIndexObject = new GUID("33000890-E5B1-11CF-89F4-00A0C90349CB");
export const IndexObject = new GUID("D6E229D3-35DA-11D1-9034-00A0C90349BE");
export const MediaObjectIndexObject = new GUID("FEB103F8-12AD-4C64-840F-2A1D2F7AD48C");
export const TimecodeIndexObject = new GUID("3CB73FD0-0C4A-4803-953D-EDF7B6228F0C");

// 10.2 Header Object GUIDs
export const FilePropertiesObject = new GUID("8CABDCA1-A947-11CF-8EE4-00C00C205365");
export const StreamPropertiesObject = new GUID("B7DC0791-A9B7-11CF-8EE6-00C00C205365");
export const HeaderExtensionObject = new GUID("5FBF03B5-A92E-11CF-8EE3-00C00C205365");
export const CodecListObject = new GUID("86D15240-311D-11D0-A3A4-00A0C90348F6");
export const ScriptCommandObject = new GUID("1EFB1A30-0B62-11D0-A39B-00A0C90348F6");
export const MarkerObject = new GUID("F487CD01-A951-11CF-8EE6-00C00C205365");
export const BitrateMutualExclusionObject = new GUID("D6E229DC-35DA-11D1-9034-00A0C90349BE");
export const ErrorCorrectionObject = new GUID("75B22635-668E-11CF-A6D9-00AA0062CE6C");
export const ContentDescriptionObject = new GUID("75B22633-668E-11CF-A6D9-00AA0062CE6C");
export const ExtendedContentDescriptionObject = new GUID("D2D0A440-E307-11D2-97F0-00A0C95EA850");
export const ContentBrandingObject = new GUID("2211B3FA-BD23-11D2-B4B7-00A0C955FC6E");
export const StreamBitratePropertiesObject = new GUID("7BF875CE-468D-11D1-8D82-006097C9A2B2");
export const ContentEncryptionObject = new GUID("2211B3FB-BD23-11D2-B4B7-00A0C955FC6E");
export const ExtendedContentEncryptionObject = new GUID("298AE614-2622-4C17-B935-DAE07EE9289C");
export const DigitalSignatureObject = new GUID("2211B3FC-BD23-11D2-B4B7-00A0C955FC6E");
export const PaddingObject = new GUID("1806D474-CADF-4509-A4BA-9AABCB96AAE8");

// 10.3 Header Extension Object GUIDs
export const ExtendedStreamPropertiesObject = new GUID("14E6A5CB-C672-4332-8399-A96952065B5A");
export const AdvancedMutualExclusionObject = new GUID("A08649CF-4775-4670-8A16-6E35357566CD");
export const GroupMutualExclusionObject = new GUID("D1465A40-5A79-4338-B71B-E36B8FD6C249");
export const StreamPrioritizationObject = new GUID("D4FED15B-88D3-454F-81F0-ED5C45999E24");
export const BandwidthSharingObject = new GUID("A69609E6-517B-11D2-B6AF-00C04FD908E9");
export const LanguageListObject = new GUID("7C4346A9-EFE0-4BFC-B229-393EDE415C85");
export const MetadataObject = new GUID("C5F8CBEA-5BAF-4877-8467-AA8C44FA4CCA");
export const MetadataLibraryObject = new GUID("44231C94-9498-49D1-A141-1D134E457054");
export const IndexParametersObject = new GUID("D6E229DF-35DA-11D1-9034-00A0C90349BE");
export const MediaObjectIndexParametersObject = new GUID("6B203BAD-3F11-48E4-ACA8-D7613DE2CFA7");
export const TimecodeIndexParametersObject = new GUID("F55E496D-9797-4B5D-8C8B-604DFE9BFB24");
export const CompatibilityObject = new GUID("26F18B5D-4584-47EC-9F5F-0E651F0452C9");
export const AdvancedContentEncryptionObject = new GUID("43058533-6981-49E6-9B74-AD12CB86D58C");

// 10.4 Stream Properties Object Stream Type GUIDs
export const AudioMedia = new GUID("F8699E40-5B4D-11CF-A8FD-00805F5C442B");
export const VideoMedia = new GUID("BC19EFC0-5B4D-11CF-A8FD-00805F5C442B");
export const CommandMedia = new GUID("59DACFC0-59E6-11D0-A3AC-00A0C90348F6");
export const JFIF_Media = new GUID("B61BE100-5B4E-11CF-A8FD-00805F5C442B");
export const Degradable_JPEG_Media = new GUID("35907DE0-E415-11CF-A917-00805F5C442B");
export const FileTransferMedia = new GUID("91BD222C-F21C-497A-8B6D-5AA86BFC0185");
export const BinaryMedia = new GUID("3AFB65E2-47EF-40F2-AC2C-70A90D71D343");

export const ASF_Index_Placeholder_Object = new GUID("D9AADE20-7C17-4F9C-BC28-8555DD98E2A2");
