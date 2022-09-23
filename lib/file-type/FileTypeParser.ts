import { indexOf, isSubArray, readUintBE } from "../compat/buffer";
import { decodeLatin1, decodeUtf8 } from "../compat/text-decoder";
import { encodeUtf8 } from "../compat/text-encoder";
import { EndOfStreamError } from "../peek-readable/EndOfFileStream";
import { UINT32_LE, UINT16_LE, UINT16_BE, UINT32_BE, UINT8, INT32_BE, UINT64_LE } from "../token-types";
import { Latin1StringType, Utf8StringType } from "../token-types/string";

import { fileTypeFromTokenizer } from "./fileTypeFromTokenizer";
import { stringToBytes, tarHeaderChecksumMatches, uint32SyncSafeToken, checkUtil } from "./util";

import type { ITokenizer } from "../strtok3/types";
import type { FileTypeResult } from "./type";

const minimumBytes = 4100; // A fair amount of file-types are detectable within this range.

export class FileTypeParser {
  buffer: Uint8Array = new Uint8Array(minimumBytes);
  tokenizer: ITokenizer;

  check(header: number[], options?: { offset: number; mask?: number[] }) {
    return checkUtil(this.buffer, header, options);
  }

  checkString(header: string, options?: { offset: number }) {
    return this.check(stringToBytes(header), options);
  }

  async parse(tokenizer: ITokenizer): Promise<FileTypeResult | undefined> {
    this.buffer = new Uint8Array(minimumBytes);

    // Keep reading until EOF if the file size is unknown.
    if (tokenizer.fileInfo.size === undefined) {
      tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
    }

    this.tokenizer = tokenizer;

    await tokenizer.peekBuffer(this.buffer, { length: 12, mayBeLess: true });

    // -- 2-byte signatures --
    if (this.check([0x42, 0x4d])) {
      return {
        ext: "bmp",
        mime: "image/bmp",
      };
    }

    if (this.check([0x0b, 0x77])) {
      return {
        ext: "ac3",
        mime: "audio/vnd.dolby.dd-raw",
      };
    }

    if (this.check([0x78, 0x01])) {
      return {
        ext: "dmg",
        mime: "application/x-apple-diskimage",
      };
    }

    if (this.check([0x4d, 0x5a])) {
      return {
        ext: "exe",
        mime: "application/x-msdownload",
      };
    }

    if (this.check([0x25, 0x21])) {
      await tokenizer.peekBuffer(this.buffer, { length: 24, mayBeLess: true });

      if (this.checkString("PS-Adobe-", { offset: 2 }) && this.checkString(" EPSF-", { offset: 14 })) {
        return {
          ext: "eps",
          mime: "application/eps",
        };
      }

      return {
        ext: "ps",
        mime: "application/postscript",
      };
    }

    if (this.check([0x1f, 0xa0]) || this.check([0x1f, 0x9d])) {
      return {
        ext: "Z",
        mime: "application/x-compress",
      };
    }

    // -- 3-byte signatures --
    if (this.check([0x47, 0x49, 0x46])) {
      return {
        ext: "gif",
        mime: "image/gif",
      };
    }

    if (this.check([0xff, 0xd8, 0xff])) {
      return {
        ext: "jpg",
        mime: "image/jpeg",
      };
    }

    if (this.check([0x49, 0x49, 0xbc])) {
      return {
        ext: "jxr",
        mime: "image/vnd.ms-photo",
      };
    }

    if (this.check([0x1f, 0x8b, 0x8])) {
      return {
        ext: "gz",
        mime: "application/gzip",
      };
    }

    if (this.check([0x42, 0x5a, 0x68])) {
      return {
        ext: "bz2",
        mime: "application/x-bzip2",
      };
    }

    if (this.checkString("ID3")) {
      await tokenizer.ignore(6); // Skip ID3 header until the header size
      const id3HeaderLength = await tokenizer.readToken(uint32SyncSafeToken);
      if (tokenizer.position + id3HeaderLength > tokenizer.fileInfo.size) {
        // Guess file type based on ID3 header for backward compatibility
        return {
          ext: "mp3",
          mime: "audio/mpeg",
        };
      }

      await tokenizer.ignore(id3HeaderLength);
      return fileTypeFromTokenizer(tokenizer); // Skip ID3 header, recursion
    }

    // Musepack, SV7
    if (this.checkString("MP+")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack",
      };
    }

    if ((this.buffer[0] === 0x43 || this.buffer[0] === 0x46) && this.check([0x57, 0x53], { offset: 1 })) {
      return {
        ext: "swf",
        mime: "application/x-shockwave-flash",
      };
    }

    // -- 4-byte signatures --
    if (this.checkString("FLIF")) {
      return {
        ext: "flif",
        mime: "image/flif",
      };
    }

    if (this.checkString("8BPS")) {
      return {
        ext: "psd",
        mime: "image/vnd.adobe.photoshop",
      };
    }

    if (this.checkString("WEBP", { offset: 8 })) {
      return {
        ext: "webp",
        mime: "image/webp",
      };
    }

    // Musepack, SV8
    if (this.checkString("MPCK")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack",
      };
    }

    if (this.checkString("FORM")) {
      return {
        ext: "aif",
        mime: "audio/aiff",
      };
    }

    if (this.checkString("icns", { offset: 0 })) {
      return {
        ext: "icns",
        mime: "image/icns",
      };
    }

    // Zip-based file formats
    // Need to be before the `zip` check
    if (this.check([0x50, 0x4b, 0x3, 0x4])) {
      // Local file header signature
      try {
        while (tokenizer.position + 30 < tokenizer.fileInfo.size) {
          await tokenizer.readBuffer(this.buffer, { length: 30 });

          // https://en.wikipedia.org/wiki/Zip_(file_format)#File_headers
          const zipHeader: {
            filename?: string;
            compressedSize: number;
            uncompressedSize: number;
            filenameLength: number;
            extraFieldLength: number;
          } = {
            compressedSize: UINT32_LE.get(this.buffer, 18),
            uncompressedSize: UINT32_LE.get(this.buffer, 22),
            filenameLength: UINT16_LE.get(this.buffer, 26),
            extraFieldLength: UINT16_LE.get(this.buffer, 28),
          };

          zipHeader.filename = await tokenizer.readToken(new Utf8StringType(zipHeader.filenameLength));
          await tokenizer.ignore(zipHeader.extraFieldLength);

          // Assumes signed `.xpi` from addons.mozilla.org
          if (zipHeader.filename === "META-INF/mozilla.rsa") {
            return {
              ext: "xpi",
              mime: "application/x-xpinstall",
            };
          }

          if (zipHeader.filename.endsWith(".rels") || zipHeader.filename.endsWith(".xml")) {
            const type = zipHeader.filename.split("/")[0];
            switch (type) {
              case "_rels":
                break;
              case "word":
                return {
                  ext: "docx",
                  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                };
              case "ppt":
                return {
                  ext: "pptx",
                  mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                };
              case "xl":
                return {
                  ext: "xlsx",
                  mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                };
              default:
                break;
            }
          }

          if (zipHeader.filename.startsWith("xl/")) {
            return {
              ext: "xlsx",
              mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            };
          }

          if (zipHeader.filename.startsWith("3D/") && zipHeader.filename.endsWith(".model")) {
            return {
              ext: "3mf",
              mime: "model/3mf",
            };
          }

          // The docx, xlsx and pptx file types extend the Office Open XML file format:
          // https://en.wikipedia.org/wiki/Office_Open_XML_file_formats
          // We look for:
          // - one entry named '[Content_Types].xml' or '_rels/.rels',
          // - one entry indicating specific type of file.
          // MS Office, OpenOffice and LibreOffice may put the parts in different order, so the check should not rely on it.
          if (zipHeader.filename === "mimetype" && zipHeader.compressedSize === zipHeader.uncompressedSize) {
            const mimeType = await tokenizer.readToken(new Utf8StringType(zipHeader.compressedSize));
            const trimmedMimeType = mimeType.trim();

            switch (trimmedMimeType) {
              case "application/epub+zip":
                return {
                  ext: "epub",
                  mime: "application/epub+zip",
                };
              case "application/vnd.oasis.opendocument.text":
                return {
                  ext: "odt",
                  mime: "application/vnd.oasis.opendocument.text",
                };
              case "application/vnd.oasis.opendocument.spreadsheet":
                return {
                  ext: "ods",
                  mime: "application/vnd.oasis.opendocument.spreadsheet",
                };
              case "application/vnd.oasis.opendocument.presentation":
                return {
                  ext: "odp",
                  mime: "application/vnd.oasis.opendocument.presentation",
                };
              default:
            }
          }

          // Try to find next header manually when current one is corrupted
          if (zipHeader.compressedSize === 0) {
            let nextHeaderIndex = -1;

            while (nextHeaderIndex < 0 && tokenizer.position < tokenizer.fileInfo.size) {
              await tokenizer.peekBuffer(this.buffer, { mayBeLess: true });

              nextHeaderIndex = indexOf(this.buffer, Uint8Array.of(0x50, 0x4b, 0x03, 0x04));
              // Move position to the next header if found, skip the whole buffer otherwise
              await tokenizer.ignore(nextHeaderIndex >= 0 ? nextHeaderIndex : this.buffer.length);
            }
          } else {
            await tokenizer.ignore(zipHeader.compressedSize);
          }
        }
      } catch (error) {
        if (!(error instanceof EndOfStreamError)) {
          throw error;
        }
      }

      return {
        ext: "zip",
        mime: "application/zip",
      };
    }

    if (this.checkString("OggS")) {
      // This is an OGG container
      await tokenizer.ignore(28);
      const type = new Uint8Array(8);
      await tokenizer.readBuffer(type);

      // Needs to be before `ogg` check
      if (checkUtil(type, [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64])) {
        return {
          ext: "opus",
          mime: "audio/opus",
        };
      }

      // If ' theora' in header.
      if (checkUtil(type, [0x80, 0x74, 0x68, 0x65, 0x6f, 0x72, 0x61])) {
        return {
          ext: "ogv",
          mime: "video/ogg",
        };
      }

      // If '\x01video' in header.
      if (checkUtil(type, [0x01, 0x76, 0x69, 0x64, 0x65, 0x6f, 0x00])) {
        return {
          ext: "ogm",
          mime: "video/ogg",
        };
      }

      // If ' FLAC' in header  https://xiph.org/flac/faq.html
      if (checkUtil(type, [0x7f, 0x46, 0x4c, 0x41, 0x43])) {
        return {
          ext: "oga",
          mime: "audio/ogg",
        };
      }

      // 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
      if (checkUtil(type, [0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20])) {
        return {
          ext: "spx",
          mime: "audio/ogg",
        };
      }

      // If '\x01vorbis' in header
      if (checkUtil(type, [0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73])) {
        return {
          ext: "ogg",
          mime: "audio/ogg",
        };
      }

      // Default OGG container https://www.iana.org/assignments/media-types/application/ogg
      return {
        ext: "ogx",
        mime: "application/ogg",
      };
    }

    if (
      this.check([0x50, 0x4b]) &&
      (this.buffer[2] === 0x3 || this.buffer[2] === 0x5 || this.buffer[2] === 0x7) &&
      (this.buffer[3] === 0x4 || this.buffer[3] === 0x6 || this.buffer[3] === 0x8)
    ) {
      return {
        ext: "zip",
        mime: "application/zip",
      };
    }

    //
    // File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
    // It's not required to be first, but it's recommended to be. Almost all ISO base media files start with `ftyp` box.
    // `ftyp` box must contain a brand major identifier, which must consist of ISO 8859-1 printable characters.
    // Here we check for 8859-1 printable characters (for simplicity, it's a mask which also catches one non-printable character).
    if (
      this.checkString("ftyp", { offset: 4 }) &&
      (this.buffer[8] & 0x60) !== 0x00 // Brand major, first character ASCII?
    ) {
      // They all can have MIME `video/mp4` except `application/mp4` special-case which is hard to detect.
      // For some cases, we're specific, everything else falls to `video/mp4` with `mp4` extension.
      const brandMajor = decodeLatin1(this.buffer.subarray(8, 12)).replace("\0", " ").trim();
      switch (brandMajor) {
        case "avif":
        case "avis":
          return { ext: "avif", mime: "image/avif" };
        case "mif1":
          return { ext: "heic", mime: "image/heif" };
        case "msf1":
          return { ext: "heic", mime: "image/heif-sequence" };
        case "heic":
        case "heix":
          return { ext: "heic", mime: "image/heic" };
        case "hevc":
        case "hevx":
          return { ext: "heic", mime: "image/heic-sequence" };
        case "qt":
          return { ext: "mov", mime: "video/quicktime" };
        case "M4V":
        case "M4VH":
        case "M4VP":
          return { ext: "m4v", mime: "video/x-m4v" };
        case "M4P":
          return { ext: "m4p", mime: "video/mp4" };
        case "M4B":
          return { ext: "m4b", mime: "audio/mp4" };
        case "M4A":
          return { ext: "m4a", mime: "audio/x-m4a" };
        case "F4V":
          return { ext: "f4v", mime: "video/mp4" };
        case "F4P":
          return { ext: "f4p", mime: "video/mp4" };
        case "F4A":
          return { ext: "f4a", mime: "audio/mp4" };
        case "F4B":
          return { ext: "f4b", mime: "audio/mp4" };
        case "crx":
          return { ext: "cr3", mime: "image/x-canon-cr3" };
        default:
          if (brandMajor.startsWith("3g")) {
            if (brandMajor.startsWith("3g2")) {
              return { ext: "3g2", mime: "video/3gpp2" };
            }

            return { ext: "3gp", mime: "video/3gpp" };
          }

          return { ext: "mp4", mime: "video/mp4" };
      }
    }

    if (this.checkString("MThd")) {
      return {
        ext: "mid",
        mime: "audio/midi",
      };
    }

    if (
      this.checkString("wOFF") &&
      (this.check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))
    ) {
      return {
        ext: "woff",
        mime: "font/woff",
      };
    }

    if (
      this.checkString("wOF2") &&
      (this.check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))
    ) {
      return {
        ext: "woff2",
        mime: "font/woff2",
      };
    }

    if (this.check([0xd4, 0xc3, 0xb2, 0xa1]) || this.check([0xa1, 0xb2, 0xc3, 0xd4])) {
      return {
        ext: "pcap",
        mime: "application/vnd.tcpdump.pcap",
      };
    }

    // Sony DSD Stream File (DSF)
    if (this.checkString("DSD ")) {
      return {
        ext: "dsf",
        mime: "audio/x-dsf", // Non-standard
      };
    }

    if (this.checkString("LZIP")) {
      return {
        ext: "lz",
        mime: "application/x-lzip",
      };
    }

    if (this.checkString("fLaC")) {
      return {
        ext: "flac",
        mime: "audio/x-flac",
      };
    }

    if (this.check([0x42, 0x50, 0x47, 0xfb])) {
      return {
        ext: "bpg",
        mime: "image/bpg",
      };
    }

    if (this.checkString("wvpk")) {
      return {
        ext: "wv",
        mime: "audio/wavpack",
      };
    }

    if (this.checkString("%PDF")) {
      await tokenizer.ignore(1350);
      const maxBufferSize = 10 * 1024 * 1024;
      const buffer = new Uint8Array(Math.min(maxBufferSize, tokenizer.fileInfo.size));
      await tokenizer.readBuffer(buffer, { mayBeLess: true });

      // Check if this is an Adobe Illustrator file
      if (isSubArray(buffer, encodeUtf8("AIPrivateData"))) {
        return {
          ext: "ai",
          mime: "application/postscript",
        };
      }

      // Assume this is just a normal PDF
      return {
        ext: "pdf",
        mime: "application/pdf",
      };
    }

    if (this.check([0x00, 0x61, 0x73, 0x6d])) {
      return {
        ext: "wasm",
        mime: "application/wasm",
      };
    }

    // TIFF, little-endian type
    if (this.check([0x49, 0x49])) {
      const fileType = await this.readTiffHeader(false);
      if (fileType) {
        return fileType;
      }
    }

    // TIFF, big-endian type
    if (this.check([0x4d, 0x4d])) {
      const fileType = await this.readTiffHeader(true);
      if (fileType) {
        return fileType;
      }
    }

    if (this.checkString("MAC ")) {
      return {
        ext: "ape",
        mime: "audio/ape",
      };
    }

    // https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
    if (this.check([0x1a, 0x45, 0xdf, 0xa3])) {
      const re = await readElement(tokenizer);
      const docType = await readChildren(tokenizer, 1, re.len);

      switch (docType) {
        case "webm":
          return {
            ext: "webm",
            mime: "video/webm",
          };

        case "matroska":
          return {
            ext: "mkv",
            mime: "video/x-matroska",
          };

        default:
          return;
      }
    }

    // RIFF file format which might be AVI, WAV, QCP, etc
    if (this.check([0x52, 0x49, 0x46, 0x46])) {
      if (this.check([0x41, 0x56, 0x49], { offset: 8 })) {
        return {
          ext: "avi",
          mime: "video/vnd.avi",
        };
      }

      if (this.check([0x57, 0x41, 0x56, 0x45], { offset: 8 })) {
        return {
          ext: "wav",
          mime: "audio/vnd.wave",
        };
      }

      // QLCM, QCP file
      if (this.check([0x51, 0x4c, 0x43, 0x4d], { offset: 8 })) {
        return {
          ext: "qcp",
          mime: "audio/qcelp",
        };
      }
    }

    if (this.checkString("SQLi")) {
      return {
        ext: "sqlite",
        mime: "application/x-sqlite3",
      };
    }

    if (this.check([0x4e, 0x45, 0x53, 0x1a])) {
      return {
        ext: "nes",
        mime: "application/x-nintendo-nes-rom",
      };
    }

    if (this.checkString("Cr24")) {
      return {
        ext: "crx",
        mime: "application/x-google-chrome-extension",
      };
    }

    if (this.checkString("MSCF") || this.checkString("ISc(")) {
      return {
        ext: "cab",
        mime: "application/vnd.ms-cab-compressed",
      };
    }

    if (this.check([0xed, 0xab, 0xee, 0xdb])) {
      return {
        ext: "rpm",
        mime: "application/x-rpm",
      };
    }

    if (this.check([0xc5, 0xd0, 0xd3, 0xc6])) {
      return {
        ext: "eps",
        mime: "application/eps",
      };
    }

    if (this.check([0x28, 0xb5, 0x2f, 0xfd])) {
      return {
        ext: "zst",
        mime: "application/zstd",
      };
    }

    if (this.check([0x7f, 0x45, 0x4c, 0x46])) {
      return {
        ext: "elf",
        mime: "application/x-elf",
      };
    }

    // -- 5-byte signatures --
    if (this.check([0x4f, 0x54, 0x54, 0x4f, 0x00])) {
      return {
        ext: "otf",
        mime: "font/otf",
      };
    }

    if (this.checkString("#!AMR")) {
      return {
        ext: "amr",
        mime: "audio/amr",
      };
    }

    if (this.checkString("{\\rtf")) {
      return {
        ext: "rtf",
        mime: "application/rtf",
      };
    }

    if (this.check([0x46, 0x4c, 0x56, 0x01])) {
      return {
        ext: "flv",
        mime: "video/x-flv",
      };
    }

    if (this.checkString("IMPM")) {
      return {
        ext: "it",
        mime: "audio/x-it",
      };
    }

    if (
      this.checkString("-lh0-", { offset: 2 }) ||
      this.checkString("-lh1-", { offset: 2 }) ||
      this.checkString("-lh2-", { offset: 2 }) ||
      this.checkString("-lh3-", { offset: 2 }) ||
      this.checkString("-lh4-", { offset: 2 }) ||
      this.checkString("-lh5-", { offset: 2 }) ||
      this.checkString("-lh6-", { offset: 2 }) ||
      this.checkString("-lh7-", { offset: 2 }) ||
      this.checkString("-lzs-", { offset: 2 }) ||
      this.checkString("-lz4-", { offset: 2 }) ||
      this.checkString("-lz5-", { offset: 2 }) ||
      this.checkString("-lhd-", { offset: 2 })
    ) {
      return {
        ext: "lzh",
        mime: "application/x-lzh-compressed",
      };
    }

    // MPEG program stream (PS or MPEG-PS)
    if (this.check([0x00, 0x00, 0x01, 0xba])) {
      //  MPEG-PS, MPEG-1 Part 1
      if (this.check([0x21], { offset: 4, mask: [0xf1] })) {
        return {
          ext: "mpg",
          mime: "video/MP1S",
        };
      }

      // MPEG-PS, MPEG-2 Part 1
      if (this.check([0x44], { offset: 4, mask: [0xc4] })) {
        return {
          ext: "mpg",
          mime: "video/MP2P",
        };
      }
    }

    if (this.checkString("ITSF")) {
      return {
        ext: "chm",
        mime: "application/vnd.ms-htmlhelp",
      };
    }

    // -- 6-byte signatures --
    if (this.check([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) {
      return {
        ext: "xz",
        mime: "application/x-xz",
      };
    }

    if (this.checkString("<?xml ")) {
      return {
        ext: "xml",
        mime: "application/xml",
      };
    }

    if (this.check([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) {
      return {
        ext: "7z",
        mime: "application/x-7z-compressed",
      };
    }

    if (this.check([0x52, 0x61, 0x72, 0x21, 0x1a, 0x7]) && (this.buffer[6] === 0x0 || this.buffer[6] === 0x1)) {
      return {
        ext: "rar",
        mime: "application/x-rar-compressed",
      };
    }

    if (this.checkString("solid ")) {
      return {
        ext: "stl",
        mime: "model/stl",
      };
    }

    // -- 7-byte signatures --
    if (this.checkString("BLENDER")) {
      return {
        ext: "blend",
        mime: "application/x-blender",
      };
    }

    if (this.checkString("!<arch>")) {
      await tokenizer.ignore(8);
      const str = await tokenizer.readToken(new Latin1StringType(13));
      if (str === "debian-binary") {
        return {
          ext: "deb",
          mime: "application/x-deb",
        };
      }

      return {
        ext: "ar",
        mime: "application/x-unix-archive",
      };
    }

    // -- 8-byte signatures --
    if (this.check([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      // APNG format (https://wiki.mozilla.org/APNG_Specification)
      // 1. Find the first IDAT (image data) chunk (49 44 41 54)
      // 2. Check if there is an "acTL" chunk before the IDAT one (61 63 54 4C)
      // Offset calculated as follows:
      // - 8 bytes: PNG signature
      // - 4 (length) + 4 (chunk type) + 13 (chunk data) + 4 (CRC): IHDR chunk
      await tokenizer.ignore(8); // ignore PNG signature

      do {
        const chunk = await readChunkHeader(tokenizer);
        if (chunk.length < 0) {
          return; // Invalid chunk length
        }

        switch (chunk.type) {
          case "IDAT":
            return {
              ext: "png",
              mime: "image/png",
            };
          case "acTL":
            return {
              ext: "apng",
              mime: "image/apng",
            };
          default:
            await tokenizer.ignore(chunk.length + 4); // Ignore chunk-data + CRC
        }
      } while (tokenizer.position + 8 < tokenizer.fileInfo.size);

      return {
        ext: "png",
        mime: "image/png",
      };
    }

    if (this.check([0x41, 0x52, 0x52, 0x4f, 0x57, 0x31, 0x00, 0x00])) {
      return {
        ext: "arrow",
        mime: "application/x-apache-arrow",
      };
    }

    if (this.check([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00])) {
      return {
        ext: "glb",
        mime: "model/gltf-binary",
      };
    }

    // `mov` format variants
    if (
      this.check([0x66, 0x72, 0x65, 0x65], { offset: 4 }) || // `free`
      this.check([0x6d, 0x64, 0x61, 0x74], { offset: 4 }) || // `mdat` MJPEG
      this.check([0x6d, 0x6f, 0x6f, 0x76], { offset: 4 }) || // `moov`
      this.check([0x77, 0x69, 0x64, 0x65], { offset: 4 }) // `wide`
    ) {
      return {
        ext: "mov",
        mime: "video/quicktime",
      };
    }

    if (this.check([0xef, 0xbb, 0xbf]) && this.checkString("<?xml", { offset: 3 })) {
      // UTF-8-BOM
      return {
        ext: "xml",
        mime: "application/xml",
      };
    }

    // -- 9-byte signatures --
    if (this.check([0x49, 0x49, 0x52, 0x4f, 0x08, 0x00, 0x00, 0x00, 0x18])) {
      return {
        ext: "orf",
        mime: "image/x-olympus-orf",
      };
    }

    if (this.checkString("gimp xcf ")) {
      return {
        ext: "xcf",
        mime: "image/x-xcf",
      };
    }

    // -- 12-byte signatures --
    if (this.check([0x49, 0x49, 0x55, 0x00, 0x18, 0x00, 0x00, 0x00, 0x88, 0xe7, 0x74, 0xd8])) {
      return {
        ext: "rw2",
        mime: "image/x-panasonic-rw2",
      };
    }

    // ASF_Header_Object first 80 bytes
    if (this.check([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9])) {
      await tokenizer.ignore(30);
      // Search for header should be in first 1KB of file.
      while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
        const header = await readHeader(tokenizer);
        let payload = header.size - 24;
        if (
          checkUtil(
            header.id,
            [0x91, 0x07, 0xdc, 0xb7, 0xb7, 0xa9, 0xcf, 0x11, 0x8e, 0xe6, 0x00, 0xc0, 0x0c, 0x20, 0x53, 0x65]
          )
        ) {
          // Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
          const typeId = new Uint8Array(16);
          payload -= await tokenizer.readBuffer(typeId);

          if (
            checkUtil(
              typeId,
              [0x40, 0x9e, 0x69, 0xf8, 0x4d, 0x5b, 0xcf, 0x11, 0xa8, 0xfd, 0x00, 0x80, 0x5f, 0x5c, 0x44, 0x2b]
            )
          ) {
            // Found audio:
            return {
              ext: "asf",
              mime: "audio/x-ms-asf",
            };
          }

          if (
            checkUtil(
              typeId,
              [0xc0, 0xef, 0x19, 0xbc, 0x4d, 0x5b, 0xcf, 0x11, 0xa8, 0xfd, 0x00, 0x80, 0x5f, 0x5c, 0x44, 0x2b]
            )
          ) {
            // Found video:
            return {
              ext: "asf",
              mime: "video/x-ms-asf",
            };
          }

          break;
        }

        await tokenizer.ignore(payload);
      }

      // Default to ASF generic extension
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf",
      };
    }

    if (this.check([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return {
        ext: "ktx",
        mime: "image/ktx",
      };
    }

    if (
      (this.check([0x7e, 0x10, 0x04]) || this.check([0x7e, 0x18, 0x04])) &&
      this.check([0x30, 0x4d, 0x49, 0x45], { offset: 4 })
    ) {
      return {
        ext: "mie",
        mime: "application/x-mie",
      };
    }

    if (this.check([0x27, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], { offset: 2 })) {
      return {
        ext: "shp",
        mime: "application/x-esri-shape",
      };
    }

    if (this.check([0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a])) {
      // JPEG-2000 family
      await tokenizer.ignore(20);
      const type = await tokenizer.readToken(new Latin1StringType(4));
      switch (type) {
        case "jp2 ":
          return {
            ext: "jp2",
            mime: "image/jp2",
          };
        case "jpx ":
          return {
            ext: "jpx",
            mime: "image/jpx",
          };
        case "jpm ":
          return {
            ext: "jpm",
            mime: "image/jpm",
          };
        case "mjp2":
          return {
            ext: "mj2",
            mime: "image/mj2",
          };
        default:
          return;
      }
    }

    if (
      this.check([0xff, 0x0a]) ||
      this.check([0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a])
    ) {
      return {
        ext: "jxl",
        mime: "image/jxl",
      };
    }

    if (
      this.check([0xfe, 0xff, 0, 60, 0, 63, 0, 120, 0, 109, 0, 108]) || // UTF-16-BOM-LE
      this.check([0xff, 0xfe, 60, 0, 63, 0, 120, 0, 109, 0, 108, 0]) // UTF-16-BOM-LE
    ) {
      return {
        ext: "xml",
        mime: "application/xml",
      };
    }

    // -- Unsafe signatures --
    if (this.check([0x0, 0x0, 0x1, 0xba]) || this.check([0x0, 0x0, 0x1, 0xb3])) {
      return {
        ext: "mpg",
        mime: "video/mpeg",
      };
    }

    if (this.check([0x00, 0x01, 0x00, 0x00, 0x00])) {
      return {
        ext: "ttf",
        mime: "font/ttf",
      };
    }

    if (this.check([0x00, 0x00, 0x01, 0x00])) {
      return {
        ext: "ico",
        mime: "image/x-icon",
      };
    }

    if (this.check([0x00, 0x00, 0x02, 0x00])) {
      return {
        ext: "cur",
        mime: "image/x-icon",
      };
    }

    if (this.check([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
      // Detected Microsoft Compound File Binary File (MS-CFB) Format.
      return {
        ext: "cfb",
        mime: "application/x-cfb",
      };
    }

    // Increase sample size from 12 to 256.
    await tokenizer.peekBuffer(this.buffer, {
      length: Math.min(256, tokenizer.fileInfo.size),
      mayBeLess: true,
    });

    // -- 15-byte signatures --
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", { offset: 6 })) {
        return {
          ext: "vcf",
          mime: "text/vcard",
        };
      }

      if (this.checkString("VCALENDAR", { offset: 6 })) {
        return {
          ext: "ics",
          mime: "text/calendar",
        };
      }
    }

    // `raf` is here just to keep all the raw image detectors together.
    if (this.checkString("FUJIFILMCCD-RAW")) {
      return {
        ext: "raf",
        mime: "image/x-fujifilm-raf",
      };
    }

    if (this.checkString("Extended Module:")) {
      return {
        ext: "xm",
        mime: "audio/x-xm",
      };
    }

    if (this.checkString("Creative Voice File")) {
      return {
        ext: "voc",
        mime: "audio/x-voc",
      };
    }

    if (this.check([0x04, 0x00, 0x00, 0x00]) && this.buffer.length >= 16) {
      // Rough & quick check Pickle/ASAR
      const jsonSize = UINT32_LE.get(this.buffer, 12);
      if (jsonSize > 12 && this.buffer.length >= jsonSize + 16) {
        try {
          const header = decodeUtf8(this.buffer.slice(16, jsonSize + 16));
          const json = JSON.parse(header);
          // Check if Pickle is ASAR
          if (json.files) {
            // Final check, assuring Pickle/ASAR format
            return {
              ext: "asar",
              mime: "application/x-asar",
            };
          }
        } catch {
          // empty
        }
      }
    }

    if (this.check([0x06, 0x0e, 0x2b, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0d, 0x01, 0x02, 0x01, 0x01, 0x02])) {
      return {
        ext: "mxf",
        mime: "application/mxf",
      };
    }

    if (this.checkString("SCRM", { offset: 44 })) {
      return {
        ext: "s3m",
        mime: "audio/x-s3m",
      };
    }

    // Raw MPEG-2 transport stream (188-byte packets)
    if (this.check([0x47]) && this.check([0x47], { offset: 188 })) {
      return {
        ext: "mts",
        mime: "video/mp2t",
      };
    }

    // Blu-ray Disc Audio-Video (BDAV) MPEG-2 transport stream has 4-byte TP_extra_header before each 188-byte packet
    if (this.check([0x47], { offset: 4 }) && this.check([0x47], { offset: 196 })) {
      return {
        ext: "mts",
        mime: "video/mp2t",
      };
    }

    if (
      this.check([0x42, 0x4f, 0x4f, 0x4b, 0x4d, 0x4f, 0x42, 0x49], {
        offset: 60,
      })
    ) {
      return {
        ext: "mobi",
        mime: "application/x-mobipocket-ebook",
      };
    }

    if (this.check([0x44, 0x49, 0x43, 0x4d], { offset: 128 })) {
      return {
        ext: "dcm",
        mime: "application/dicom",
      };
    }

    if (
      this.check([
        0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x46,
      ])
    ) {
      return {
        ext: "lnk",
        mime: "application/x.ms.shortcut", // Invented by us
      };
    }

    if (this.check([0x62, 0x6f, 0x6f, 0x6b, 0x00, 0x00, 0x00, 0x00, 0x6d, 0x61, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x00])) {
      return {
        ext: "alias",
        mime: "application/x.apple.alias", // Invented by us
      };
    }

    if (
      this.check([0x4c, 0x50], { offset: 34 }) &&
      (this.check([0x00, 0x00, 0x01], { offset: 8 }) ||
        this.check([0x01, 0x00, 0x02], { offset: 8 }) ||
        this.check([0x02, 0x00, 0x02], { offset: 8 }))
    ) {
      return {
        ext: "eot",
        mime: "application/vnd.ms-fontobject",
      };
    }

    if (this.check([0x06, 0x06, 0xed, 0xf5, 0xd8, 0x1d, 0x46, 0xe5, 0xbd, 0x31, 0xef, 0xe7, 0xfe, 0x74, 0xb7, 0x1d])) {
      return {
        ext: "indd",
        mime: "application/x-indesign",
      };
    }

    // Increase sample size from 256 to 512
    await tokenizer.peekBuffer(this.buffer, {
      length: Math.min(512, tokenizer.fileInfo.size),
      mayBeLess: true,
    });

    // Requires a buffer size of 512 bytes
    if (tarHeaderChecksumMatches(this.buffer)) {
      return {
        ext: "tar",
        mime: "application/x-tar",
      };
    }

    if (
      this.check([
        0xff, 0xfe, 0xff, 0x0e, 0x53, 0x00, 0x6b, 0x00, 0x65, 0x00, 0x74, 0x00, 0x63, 0x00, 0x68, 0x00, 0x55, 0x00,
        0x70, 0x00, 0x20, 0x00, 0x4d, 0x00, 0x6f, 0x00, 0x64, 0x00, 0x65, 0x00, 0x6c, 0x00,
      ])
    ) {
      return {
        ext: "skp",
        mime: "application/vnd.sketchup.skp",
      };
    }

    if (this.checkString("-----BEGIN PGP MESSAGE-----")) {
      return {
        ext: "pgp",
        mime: "application/pgp-encrypted",
      };
    }

    // Check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE)
    if (this.buffer.length >= 2 && this.check([0xff, 0xe0], { offset: 0, mask: [0xff, 0xe0] })) {
      if (this.check([0x10], { offset: 1, mask: [0x16] })) {
        // Check for (ADTS) MPEG-2
        if (this.check([0x08], { offset: 1, mask: [0x08] })) {
          return {
            ext: "aac",
            mime: "audio/aac",
          };
        }

        // Must be (ADTS) MPEG-4
        return {
          ext: "aac",
          mime: "audio/aac",
        };
      }

      // MPEG 1 or 2 Layer 3 header
      // Check for MPEG layer 3
      if (this.check([0x02], { offset: 1, mask: [0x06] })) {
        return {
          ext: "mp3",
          mime: "audio/mpeg",
        };
      }

      // Check for MPEG layer 2
      if (this.check([0x04], { offset: 1, mask: [0x06] })) {
        return {
          ext: "mp2",
          mime: "audio/mpeg",
        };
      }

      // Check for MPEG layer 1
      if (this.check([0x06], { offset: 1, mask: [0x06] })) {
        return {
          ext: "mp1",
          mime: "audio/mpeg",
        };
      }
    }
  }

  async readTiffTag(bigEndian: any): Promise<FileTypeResult | undefined> {
    const tagId = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    void this.tokenizer.ignore(10);
    switch (tagId) {
      case 50_341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw",
        };
      case 50_706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng",
        };
      default:
    }
  }

  async readTiffIFD(bigEndian: boolean): Promise<FileTypeResult | undefined> {
    const numberOfTags = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    for (let n = 0; n < numberOfTags; ++n) {
      const fileType = await this.readTiffTag(bigEndian);
      if (fileType) {
        return fileType;
      }
    }
  }

  async readTiffHeader(bigEndian: boolean): Promise<FileTypeResult | undefined> {
    const version = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 2);
    const ifdOffset = (bigEndian ? UINT32_BE : UINT32_LE).get(this.buffer, 4);

    if (version === 42) {
      // TIFF file header
      if (ifdOffset >= 6) {
        if (this.checkString("CR", { offset: 8 })) {
          return {
            ext: "cr2",
            mime: "image/x-canon-cr2",
          };
        }

        if (
          ifdOffset >= 8 &&
          (this.check([0x1c, 0x00, 0xfe, 0x00], { offset: 8 }) || this.check([0x1f, 0x00, 0x0b, 0x00], { offset: 8 }))
        ) {
          return {
            ext: "nef",
            mime: "image/x-nikon-nef",
          };
        }
      }

      await this.tokenizer.ignore(ifdOffset);
      const fileType = await this.readTiffIFD(false);
      return (
        fileType ?? {
          ext: "tif",
          mime: "image/tiff",
        }
      );
    }

    if (version === 43) {
      // Big TIFF file header
      return {
        ext: "tif",
        mime: "image/tiff",
      };
    }
  }
}

// Root element: EBML
/**
 *
 * @param tokenizer
 */
async function readField(tokenizer: ITokenizer) {
  const msb = await tokenizer.peekNumber(UINT8);
  let mask = 0x80;
  let ic = 0; // 0 = A, 1 = B, 2 = C, 3

  // = D
  while ((msb & mask) === 0) {
    ++ic;
    mask >>= 1;
  }

  const id = new Uint8Array(ic + 1);
  await tokenizer.readBuffer(id);
  return id;
}

/**
 *
 * @param tokenizer
 */
async function readElement(tokenizer: ITokenizer) {
  const id = await readField(tokenizer);
  const lengthField = await readField(tokenizer);
  lengthField[0] ^= 0x80 >> (lengthField.length - 1);
  const nrLength = Math.min(6, lengthField.length); // JavaScript can max read 6 bytes integer
  return {
    id: readUintBE(id, 0, id.length),
    len: readUintBE(lengthField, lengthField.length - nrLength, nrLength),
  };
}

/**
 *
 * @param tokenizer
 * @param level
 * @param children
 */
async function readChildren(tokenizer: ITokenizer, level: number, children: number) {
  while (children > 0) {
    const element = await readElement(tokenizer);
    if (element.id === 17_026) {
      const rawValue = await tokenizer.readToken(new Utf8StringType(element.len));
      return rawValue.replace(/\00.*$/g, ""); // Return DocType
    }

    await tokenizer.ignore(element.len); // ignore payload
    --children;
  }
}

/**
 *
 * @param tokenizer
 */
async function readChunkHeader(tokenizer: ITokenizer) {
  return {
    length: await tokenizer.readToken(INT32_BE),
    type: await tokenizer.readToken(new Latin1StringType(4)),
  };
}

/**
 *
 * @param tokenizer
 */
async function readHeader(tokenizer: ITokenizer) {
  const guid = new Uint8Array(16);
  await tokenizer.readBuffer(guid);
  return {
    id: guid,
    size: Number(await tokenizer.readToken(UINT64_LE)),
  };
}
