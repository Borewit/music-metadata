import { GenericTagId } from "./GenericTagId";

export type TagType =
  | "vorbis"
  | "ID3v1"
  | "ID3v2.2"
  | "ID3v2.3"
  | "ID3v2.4"
  | "APEv2"
  | "asf"
  | "iTunes"
  | "exif"
  | "matroska";

export interface IGenericTag<Id extends GenericTagId = GenericTagId> {
  id: Id;
  value: any;
}

export interface INativeTagMap {
  [index: string]: GenericTagId;
}
