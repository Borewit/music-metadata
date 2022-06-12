export type MimeType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/flif"
  | "image/x-xcf"
  | "image/x-canon-cr2"
  | "image/x-canon-cr3"
  | "image/tiff"
  | "image/bmp"
  | "image/icns"
  | "image/vnd.ms-photo"
  | "image/vnd.adobe.photoshop"
  | "application/x-indesign"
  | "application/epub+zip"
  | "application/x-xpinstall"
  | "application/vnd.oasis.opendocument.text"
  | "application/vnd.oasis.opendocument.spreadsheet"
  | "application/vnd.oasis.opendocument.presentation"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/zip"
  | "application/x-tar"
  | "application/x-rar-compressed"
  | "application/gzip"
  | "application/x-bzip2"
  | "application/x-7z-compressed"
  | "application/x-apple-diskimage"
  | "video/mp4"
  | "audio/midi"
  | "video/x-matroska"
  | "video/webm"
  | "video/quicktime"
  | "video/vnd.avi"
  | "audio/vnd.wave"
  | "audio/qcelp"
  | "audio/x-ms-asf"
  | "video/x-ms-asf"
  | "application/vnd.ms-asf"
  | "video/mpeg"
  | "video/3gpp"
  | "audio/mpeg"
  | "audio/mp4" // RFC 4337
  | "audio/opus"
  | "video/ogg"
  | "audio/ogg"
  | "application/ogg"
  | "audio/x-flac"
  | "audio/ape"
  | "audio/wavpack"
  | "audio/amr"
  | "application/pdf"
  | "application/x-elf"
  | "application/x-msdownload"
  | "application/x-shockwave-flash"
  | "application/rtf"
  | "application/wasm"
  | "font/woff"
  | "font/woff2"
  | "application/vnd.ms-fontobject"
  | "font/ttf"
  | "font/otf"
  | "image/x-icon"
  | "video/x-flv"
  | "application/postscript"
  | "application/eps"
  | "application/x-xz"
  | "application/x-sqlite3"
  | "application/x-nintendo-nes-rom"
  | "application/x-google-chrome-extension"
  | "application/vnd.ms-cab-compressed"
  | "application/x-deb"
  | "application/x-unix-archive"
  | "application/x-rpm"
  | "application/x-compress"
  | "application/x-lzip"
  | "application/x-cfb"
  | "application/x-mie"
  | "application/x-apache-arrow"
  | "application/mxf"
  | "video/mp2t"
  | "application/x-blender"
  | "image/bpg"
  | "image/jp2"
  | "image/jpx"
  | "image/jpm"
  | "image/mj2"
  | "audio/aiff"
  | "application/xml"
  | "application/x-mobipocket-ebook"
  | "image/heif"
  | "image/heif-sequence"
  | "image/heic"
  | "image/heic-sequence"
  | "image/ktx"
  | "application/dicom"
  | "audio/x-musepack"
  | "text/calendar"
  | "text/vcard"
  | "model/gltf-binary"
  | "application/vnd.tcpdump.pcap"
  | "audio/x-dsf" // Non-standard
  | "application/x.ms.shortcut" // Invented by us
  | "application/x.apple.alias" // Invented by us
  | "audio/x-voc"
  | "audio/vnd.dolby.dd-raw"
  | "audio/x-m4a"
  | "image/apng"
  | "image/x-olympus-orf"
  | "image/x-sony-arw"
  | "image/x-adobe-dng"
  | "image/x-nikon-nef"
  | "image/x-panasonic-rw2"
  | "image/x-fujifilm-raf"
  | "video/x-m4v"
  | "video/3gpp2"
  | "application/x-esri-shape"
  | "audio/aac"
  | "audio/x-it"
  | "audio/x-s3m"
  | "audio/x-xm"
  | "video/MP1S"
  | "video/MP2P"
  | "application/vnd.sketchup.skp"
  | "image/avif"
  | "application/x-lzh-compressed"
  | "application/pgp-encrypted"
  | "application/x-asar"
  | "model/stl"
  | "application/vnd.ms-htmlhelp"
  | "model/3mf"
  | "image/jxl"
  | "application/zstd";

export const mimeTypes: MimeType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/flif",
  "image/x-xcf",
  "image/x-canon-cr2",
  "image/x-canon-cr3",
  "image/tiff",
  "image/bmp",
  "image/vnd.ms-photo",
  "image/vnd.adobe.photoshop",
  "application/x-indesign",
  "application/epub+zip",
  "application/x-xpinstall",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-tar",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-apache-arrow",
  "video/mp4",
  "audio/midi",
  "video/x-matroska",
  "video/webm",
  "video/quicktime",
  "video/vnd.avi",
  "audio/vnd.wave",
  "audio/qcelp",
  "audio/x-ms-asf",
  "video/x-ms-asf",
  "application/vnd.ms-asf",
  "video/mpeg",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp4", // RFC 4337
  "audio/opus",
  "video/ogg",
  "audio/ogg",
  "application/ogg",
  "audio/x-flac",
  "audio/ape",
  "audio/wavpack",
  "audio/amr",
  "application/pdf",
  "application/x-elf",
  "application/x-msdownload",
  "application/x-shockwave-flash",
  "application/rtf",
  "application/wasm",
  "font/woff",
  "font/woff2",
  "application/vnd.ms-fontobject",
  "font/ttf",
  "font/otf",
  "image/x-icon",
  "video/x-flv",
  "application/postscript",
  "application/eps",
  "application/x-xz",
  "application/x-sqlite3",
  "application/x-nintendo-nes-rom",
  "application/x-google-chrome-extension",
  "application/vnd.ms-cab-compressed",
  "application/x-deb",
  "application/x-unix-archive",
  "application/x-rpm",
  "application/x-compress",
  "application/x-lzip",
  "application/x-cfb",
  "application/x-mie",
  "application/mxf",
  "video/mp2t",
  "application/x-blender",
  "image/bpg",
  "image/jp2",
  "image/jpx",
  "image/jpm",
  "image/mj2",
  "audio/aiff",
  "application/xml",
  "application/x-mobipocket-ebook",
  "image/heif",
  "image/heif-sequence",
  "image/heic",
  "image/heic-sequence",
  "image/icns",
  "image/ktx",
  "application/dicom",
  "audio/x-musepack",
  "text/calendar",
  "text/vcard",
  "model/gltf-binary",
  "application/vnd.tcpdump.pcap",
  "audio/x-dsf", // Non-standard
  "application/x.ms.shortcut", // Invented by us
  "application/x.apple.alias", // Invented by us
  "audio/x-voc",
  "audio/vnd.dolby.dd-raw",
  "audio/x-m4a",
  "image/apng",
  "image/x-olympus-orf",
  "image/x-sony-arw",
  "image/x-adobe-dng",
  "image/x-nikon-nef",
  "image/x-panasonic-rw2",
  "image/x-fujifilm-raf",
  "video/x-m4v",
  "video/3gpp2",
  "application/x-esri-shape",
  "audio/aac",
  "audio/x-it",
  "audio/x-s3m",
  "audio/x-xm",
  "video/MP1S",
  "video/MP2P",
  "application/vnd.sketchup.skp",
  "image/avif",
  "application/x-lzh-compressed",
  "application/pgp-encrypted",
  "application/x-asar",
  "model/stl",
  "application/vnd.ms-htmlhelp",
  "model/3mf",
  "image/jxl",
  "application/zstd",
];

/**
 * Supported MIME types.
 */
export const supportedMimeTypes: ReadonlySet<MimeType> = new Set(mimeTypes);
