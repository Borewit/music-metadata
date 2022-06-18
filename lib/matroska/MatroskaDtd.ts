import { DataType, IContainerType } from "./types";

/**
 * Elements of document type description
 * Derived from https://github.com/tungol/EBML/blob/master/doctypes/matroska.dtd
 * Extended with:
 * - https://www.matroska.org/technical/specs/index.html
 */
export const elements: IContainerType = {
  0x1a_45_df_a3: {
    // 5.1
    name: "ebml",
    container: {
      0x42_86: { name: "ebmlVersion", value: DataType.uint }, // 5.1.1
      0x42_f7: { name: "ebmlReadVersion", value: DataType.uint }, // 5.1.2
      0x42_f2: { name: "ebmlMaxIDWidth", value: DataType.uint }, // 5.1.3
      0x42_f3: { name: "ebmlMaxSizeWidth", value: DataType.uint }, // 5.1.4
      0x42_82: { name: "docType", value: DataType.string }, // 5.1.5
      0x42_87: { name: "docTypeVersion", value: DataType.uint }, // 5.1.6
      0x42_85: { name: "docTypeReadVersion", value: DataType.uint }, // 5.1.7
    },
  },

  // Matroska segments
  0x18_53_80_67: {
    name: "segment",
    container: {
      // Meta Seek Information
      0x11_4d_9b_74: {
        name: "seekHead",
        container: {
          0x4d_bb: {
            name: "seek",
            container: {
              0x53_ab: { name: "seekId", value: DataType.binary },
              0x53_ac: { name: "seekPosition", value: DataType.uint },
            },
          },
        },
      },

      // Segment Information
      0x15_49_a9_66: {
        name: "info",
        container: {
          0x73_a4: { name: "uid", value: DataType.uid },
          0x73_84: { name: "filename", value: DataType.string },
          0x3c_b9_23: { name: "prevUID", value: DataType.uid },
          0x3c_83_ab: { name: "prevFilename", value: DataType.string },
          0x3e_b9_23: { name: "nextUID", value: DataType.uid },
          0x3e_83_bb: { name: "nextFilename", value: DataType.string },
          0x2a_d7_b1: { name: "timecodeScale", value: DataType.uint },
          0x44_89: { name: "duration", value: DataType.float },
          0x44_61: { name: "dateUTC", value: DataType.uint },
          0x7b_a9: { name: "title", value: DataType.string },
          0x4d_80: { name: "muxingApp", value: DataType.string },
          0x57_41: { name: "writingApp", value: DataType.string },
        },
      },

      // Cluster
      0x1f_43_b6_75: {
        name: "cluster",
        multiple: true,
        container: {
          0xe7: { name: "timecode", value: DataType.uid },
          0xa3: { name: "unknown", value: DataType.binary },
          0xa7: { name: "position", value: DataType.uid },
          0xab: { name: "prevSize", value: DataType.uid },
        },
      },

      // Track
      0x16_54_ae_6b: {
        name: "tracks",
        container: {
          0xae: {
            name: "entries",
            multiple: true,
            container: {
              0xd7: { name: "trackNumber", value: DataType.uint },
              0x73_c5: { name: "uid", value: DataType.uid },
              0x83: { name: "trackType", value: DataType.uint },
              0xb9: { name: "flagEnabled", value: DataType.bool },
              0x88: { name: "flagDefault", value: DataType.bool },
              0x55_aa: { name: "flagForced", value: DataType.bool }, // extended
              0x9c: { name: "flagLacing", value: DataType.bool },
              0x6d_e7: { name: "minCache", value: DataType.uint },
              0x6d_e8: { name: "maxCache", value: DataType.uint },
              0x23_e3_83: { name: "defaultDuration", value: DataType.uint },
              0x23_31_4f: { name: "timecodeScale", value: DataType.float },
              0x53_6e: { name: "name", value: DataType.string },
              0x22_b5_9c: { name: "language", value: DataType.string },
              0x86: { name: "codecID", value: DataType.string },
              0x63_a2: { name: "codecPrivate", value: DataType.binary },
              0x25_86_88: { name: "codecName", value: DataType.string },
              0x3a_96_97: { name: "codecSettings", value: DataType.string },
              0x3b_40_40: { name: "codecInfoUrl", value: DataType.string },
              0x26_b2_40: { name: "codecDownloadUrl", value: DataType.string },
              0xaa: { name: "codecDecodeAll", value: DataType.bool },
              0x6f_ab: { name: "trackOverlay", value: DataType.uint },

              // Video
              0xe0: {
                name: "video",
                container: {
                  0x9a: { name: "flagInterlaced", value: DataType.bool },
                  0x53_b8: { name: "stereoMode", value: DataType.uint },
                  0xb0: { name: "pixelWidth", value: DataType.uint },
                  0xba: { name: "pixelHeight", value: DataType.uint },
                  0x54_b0: { name: "displayWidth", value: DataType.uint },
                  0x54_ba: { name: "displayHeight", value: DataType.uint },
                  0x54_b3: { name: "aspectRatioType", value: DataType.uint },
                  0x2e_b5_24: { name: "colourSpace", value: DataType.uint },
                  0x2f_b5_23: { name: "gammaValue", value: DataType.float },
                },
              },

              // Audio
              0xe1: {
                name: "audio",
                container: {
                  0xb5: { name: "samplingFrequency", value: DataType.float },
                  0x78_b5: {
                    name: "outputSamplingFrequency",
                    value: DataType.float,
                  },
                  0x9f: { name: "channels", value: DataType.uint }, // https://www.matroska.org/technical/specs/index.html
                  0x94: { name: "channels", value: DataType.uint },
                  0x7d_7b: { name: "channelPositions", value: DataType.binary },
                  0x62_64: { name: "bitDepth", value: DataType.uint },
                },
              },

              // Content Encoding
              0x6d_80: {
                name: "contentEncodings",
                container: {
                  0x62_40: {
                    name: "contentEncoding",
                    container: {
                      0x50_31: { name: "order", value: DataType.uint },
                      0x50_32: { name: "scope", value: DataType.bool },
                      0x50_33: { name: "type", value: DataType.uint },
                      0x50_34: {
                        name: "contentEncoding",
                        container: {
                          0x42_54: {
                            name: "contentCompAlgo",
                            value: DataType.uint,
                          },
                          0x42_55: {
                            name: "contentCompSettings",
                            value: DataType.binary,
                          },
                        },
                      },
                      0x50_35: {
                        name: "contentEncoding",
                        container: {
                          0x47_e1: {
                            name: "contentEncAlgo",
                            value: DataType.uint,
                          },
                          0x47_e2: {
                            name: "contentEncKeyID",
                            value: DataType.binary,
                          },
                          0x47_e3: {
                            name: "contentSignature ",
                            value: DataType.binary,
                          },
                          0x47_e4: {
                            name: "ContentSigKeyID  ",
                            value: DataType.binary,
                          },
                          0x47_e5: {
                            name: "contentSigAlgo ",
                            value: DataType.uint,
                          },
                          0x47_e6: {
                            name: "contentSigHashAlgo ",
                            value: DataType.uint,
                          },
                        },
                      },
                      0x62_64: { name: "bitDepth", value: DataType.uint },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Cueing Data
      0x1c_53_bb_6b: {
        name: "cues",
        container: {
          0xbb: {
            name: "cuePoint",
            container: {
              0xb3: { name: "cueTime", value: DataType.uid },
              0xb7: {
                name: "positions",
                container: {
                  0xf7: { name: "track", value: DataType.uint },
                  0xf1: { name: "clusterPosition", value: DataType.uint },
                  0x53_78: { name: "blockNumber", value: DataType.uint },
                  0xea: { name: "codecState", value: DataType.uint },
                  0xdb: {
                    name: "reference",
                    container: {
                      0x96: { name: "time", value: DataType.uint },
                      0x97: { name: "cluster", value: DataType.uint },
                      0x53_5f: { name: "number", value: DataType.uint },
                      0xeb: { name: "codecState", value: DataType.uint },
                    },
                  },
                  0xf0: { name: "relativePosition", value: DataType.uint }, // extended
                },
              },
            },
          },
        },
      },

      // Attachment
      0x19_41_a4_69: {
        name: "attachments",
        container: {
          0x61_a7: {
            name: "attachedFiles",
            multiple: true,
            container: {
              0x46_7e: { name: "description", value: DataType.string },
              0x46_6e: { name: "name", value: DataType.string },
              0x46_60: { name: "mimeType", value: DataType.string },
              0x46_5c: { name: "data", value: DataType.binary },
              0x46_ae: { name: "uid", value: DataType.uid },
            },
          },
        },
      },

      // Chapters
      0x10_43_a7_70: {
        name: "chapters",
        container: {
          0x45_b9: {
            name: "editionEntry",
            container: {
              0xb6: {
                name: "chapterAtom",
                container: {
                  0x73_c4: { name: "uid", value: DataType.uid },
                  0x91: { name: "timeStart", value: DataType.uint },
                  0x92: { name: "timeEnd", value: DataType.uid },
                  0x98: { name: "hidden", value: DataType.bool },
                  0x45_98: { name: "enabled", value: DataType.uid },
                  0x8f: {
                    name: "track",
                    container: {
                      0x89: { name: "trackNumber", value: DataType.uid },
                      0x80: {
                        name: "display",
                        container: {
                          0x85: { name: "string", value: DataType.string },
                          0x43_7c: {
                            name: "language ",
                            value: DataType.string,
                          },
                          0x43_7e: { name: "country ", value: DataType.string },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Tagging
      0x12_54_c3_67: {
        name: "tags",
        container: {
          0x73_73: {
            name: "tag",
            multiple: true,
            container: {
              0x63_c0: {
                name: "target",
                container: {
                  0x63_c5: { name: "tagTrackUID", value: DataType.uid },
                  0x63_c4: { name: "tagChapterUID", value: DataType.uint },
                  0x63_c6: { name: "tagAttachmentUID", value: DataType.uid },
                  0x63_ca: { name: "targetType", value: DataType.string }, // extended
                  0x68_ca: { name: "targetTypeValue", value: DataType.uint }, // extended
                  0x63_c9: { name: "tagEditionUID", value: DataType.uid }, // extended
                },
              },
              0x67_c8: {
                name: "simpleTags",
                multiple: true,
                container: {
                  0x45_a3: { name: "name", value: DataType.string },
                  0x44_87: { name: "string", value: DataType.string },
                  0x44_85: { name: "binary", value: DataType.binary },
                  0x44_7a: { name: "language", value: DataType.string }, // extended
                  0x44_7b: { name: "languageIETF", value: DataType.string }, // extended
                  0x44_84: { name: "default", value: DataType.bool }, // extended
                },
              },
            },
          },
        },
      },
    },
  },
};
