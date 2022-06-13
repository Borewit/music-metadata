/**
 * The picture type according to the ID3v2 APIC frame
 * Ref: http://id3.org/id3v2.3.0#Attached_picture
 */
export enum AttachedPictureType {
  "Other",
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. label side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype",
}
