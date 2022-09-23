export type FileExtension =
  | "jpg"
  | "png"
  | "apng"
  | "gif"
  | "webp"
  | "flif"
  | "xcf"
  | "cr2"
  | "cr3"
  | "orf"
  | "arw"
  | "dng"
  | "nef"
  | "rw2"
  | "raf"
  | "tif"
  | "bmp"
  | "icns"
  | "jxr"
  | "psd"
  | "indd"
  | "zip"
  | "tar"
  | "rar"
  | "gz"
  | "bz2"
  | "7z"
  | "dmg"
  | "mp4"
  | "mid"
  | "mkv"
  | "webm"
  | "mov"
  | "avi"
  | "mpg"
  | "mp2"
  | "mp3"
  | "m4a"
  | "ogg"
  | "opus"
  | "flac"
  | "wav"
  | "qcp"
  | "amr"
  | "pdf"
  | "epub"
  | "mobi"
  | "elf"
  | "exe"
  | "swf"
  | "rtf"
  | "woff"
  | "woff2"
  | "eot"
  | "ttf"
  | "otf"
  | "ico"
  | "flv"
  | "ps"
  | "xz"
  | "sqlite"
  | "nes"
  | "crx"
  | "xpi"
  | "cab"
  | "deb"
  | "ar"
  | "rpm"
  | "Z"
  | "lz"
  | "cfb"
  | "mxf"
  | "mts"
  | "wasm"
  | "blend"
  | "bpg"
  | "docx"
  | "pptx"
  | "xlsx"
  | "3gp"
  | "3g2"
  | "jp2"
  | "jpm"
  | "jpx"
  | "mj2"
  | "aif"
  | "odt"
  | "ods"
  | "odp"
  | "xml"
  | "heic"
  | "cur"
  | "ktx"
  | "ape"
  | "wv"
  | "asf"
  | "dcm"
  | "mpc"
  | "ics"
  | "glb"
  | "pcap"
  | "dsf"
  | "lnk"
  | "alias"
  | "voc"
  | "ac3"
  | "m4b"
  | "m4p"
  | "m4v"
  | "f4a"
  | "f4b"
  | "f4p"
  | "f4v"
  | "mie"
  | "ogv"
  | "ogm"
  | "oga"
  | "spx"
  | "ogx"
  | "arrow"
  | "shp"
  | "aac"
  | "mp1"
  | "it"
  | "s3m"
  | "xm"
  | "ai"
  | "skp"
  | "avif"
  | "eps"
  | "lzh"
  | "pgp"
  | "asar"
  | "stl"
  | "chm"
  | "3mf"
  | "zst"
  | "jxl"
  | "vcf";

export const extensions: FileExtension[] = [
  "jpg",
  "png",
  "apng",
  "gif",
  "webp",
  "flif",
  "xcf",
  "cr2",
  "cr3",
  "orf",
  "arw",
  "dng",
  "nef",
  "rw2",
  "raf",
  "tif",
  "bmp",
  "icns",
  "jxr",
  "psd",
  "indd",
  "zip",
  "tar",
  "rar",
  "gz",
  "bz2",
  "7z",
  "dmg",
  "mp4",
  "mid",
  "mkv",
  "webm",
  "mov",
  "avi",
  "mpg",
  "mp2",
  "mp3",
  "m4a",
  "oga",
  "ogg",
  "ogv",
  "opus",
  "flac",
  "wav",
  "spx",
  "amr",
  "pdf",
  "epub",
  "elf",
  "exe",
  "swf",
  "rtf",
  "wasm",
  "woff",
  "woff2",
  "eot",
  "ttf",
  "otf",
  "ico",
  "flv",
  "ps",
  "xz",
  "sqlite",
  "nes",
  "crx",
  "xpi",
  "cab",
  "deb",
  "ar",
  "rpm",
  "Z",
  "lz",
  "cfb",
  "mxf",
  "mts",
  "blend",
  "bpg",
  "docx",
  "pptx",
  "xlsx",
  "3gp",
  "3g2",
  "jp2",
  "jpm",
  "jpx",
  "mj2",
  "aif",
  "qcp",
  "odt",
  "ods",
  "odp",
  "xml",
  "mobi",
  "heic",
  "cur",
  "ktx",
  "ape",
  "wv",
  "dcm",
  "ics",
  "glb",
  "pcap",
  "dsf",
  "lnk",
  "alias",
  "voc",
  "ac3",
  "m4v",
  "m4p",
  "m4b",
  "f4v",
  "f4p",
  "f4b",
  "f4a",
  "mie",
  "asf",
  "ogm",
  "ogx",
  "mpc",
  "arrow",
  "shp",
  "aac",
  "mp1",
  "it",
  "s3m",
  "xm",
  "ai",
  "skp",
  "avif",
  "eps",
  "lzh",
  "pgp",
  "asar",
  "stl",
  "chm",
  "3mf",
  "zst",
  "jxl",
  "vcf",
];

/**
 * Supported file extensions.
 */
export const supportedExtensions: ReadonlySet<FileExtension> = new Set(extensions);
