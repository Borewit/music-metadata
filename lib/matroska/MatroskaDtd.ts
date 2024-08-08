import { DataType, type IContainerType } from './types.js';

/**
 * Elements of document type description
 * Derived from https://github.com/tungol/EBML/blob/master/doctypes/matroska.dtd
 * Extended with:
 * - https://www.matroska.org/technical/specs/index.html
 */
export const elements: IContainerType = {
  440786851: { // 5.1
    name: 'ebml',
    container: {
      17030: {name: 'ebmlVersion', value: DataType.uint}, // 5.1.1
      17143: {name: 'ebmlReadVersion', value: DataType.uint}, // 5.1.2
      17138: {name: 'ebmlMaxIDWidth', value: DataType.uint}, // 5.1.3
      17139: {name: 'ebmlMaxSizeWidth', value: DataType.uint}, // 5.1.4
      17026: {name: 'docType', value: DataType.string}, // 5.1.5
      17031: {name: 'docTypeVersion', value: DataType.uint}, // 5.1.6
      17029: {name: 'docTypeReadVersion', value: DataType.uint} // 5.1.7
    }
  },

  // Matroska segments
  408125543: {
    name: 'segment',
    container: {

      // Meta Seek Information
      290298740: {
        name: 'seekHead',
        container: {
          19899: {
            name: 'seek',
            container: {
              21419: {name: 'seekId', value: DataType.binary},
              21420: {name: 'seekPosition', value: DataType.uint}
            }
          }
        }
      },

      // Segment Information
      357149030: {
        name: 'info',
        container: {
          29604: {name: 'uid', value: DataType.uid},
          29572: {name: 'filename', value: DataType.string},
          3979555: {name: 'prevUID', value: DataType.uid},
          3965867: {name: 'prevFilename', value: DataType.string},
          4110627: {name: 'nextUID', value: DataType.uid},
          4096955: {name: 'nextFilename', value: DataType.string},
          2807729: {name: 'timecodeScale', value: DataType.uint},
          17545: {name: 'duration', value: DataType.float},
          17505: {name: 'dateUTC', value: DataType.uint},
          31657: {name: 'title', value: DataType.string},
          19840: {name: 'muxingApp', value: DataType.string},
          22337: {name: 'writingApp', value: DataType.string}
        }
      },

      // Cluster
      524531317: {
        name: 'cluster',
        multiple: true,
        container: {
          231: {name: 'timecode', value: DataType.uid},
          163: {name: 'unknown', value: DataType.binary},
          167: {name: 'position', value: DataType.uid},
          171: {name: 'prevSize', value: DataType.uid}
        }
      },

      // Track
      374648427: {
        name: 'tracks',
        container: {
          174: {
            name: 'entries',
            multiple: true,
            container: {
              215: {name: 'trackNumber', value: DataType.uint},
              29637: {name: 'uid', value: DataType.uid},
              131: {name: 'trackType', value: DataType.uint},
              185: {name: 'flagEnabled', value: DataType.bool},
              136: {name: 'flagDefault', value: DataType.bool},
              21930: {name: 'flagForced', value: DataType.bool}, // extended
              156: {name: 'flagLacing', value: DataType.bool},
              28135: {name: 'minCache', value: DataType.uint},
              28136: {name: 'maxCache', value: DataType.uint},
              2352003: {name: 'defaultDuration', value: DataType.uint},
              2306383: {name: 'timecodeScale', value: DataType.float},
              21358: {name: 'name', value: DataType.string},
              2274716: {name: 'language', value: DataType.string},
              134: {name: 'codecID', value: DataType.string},
              25506: {name: 'codecPrivate', value: DataType.binary},
              2459272: {name: 'codecName', value: DataType.string},
              3839639: {name: 'codecSettings', value: DataType.string},
              3883072: {name: 'codecInfoUrl', value: DataType.string},
              2536000: {name: 'codecDownloadUrl', value: DataType.string},
              170: {name: 'codecDecodeAll', value: DataType.bool},
              28587: {name: 'trackOverlay', value: DataType.uint},

              // Video
              224: {
                name: 'video',
                container: {
                  154: {name: 'flagInterlaced', value: DataType.bool},
                  21432: {name: 'stereoMode', value: DataType.uint},
                  176: {name: 'pixelWidth', value: DataType.uint},
                  186: {name: 'pixelHeight', value: DataType.uint},
                  21680: {name: 'displayWidth', value: DataType.uint},
                  21690: {name: 'displayHeight', value: DataType.uint},
                  21683: {name: 'aspectRatioType', value: DataType.uint},
                  3061028: {name: 'colourSpace', value: DataType.uint},
                  3126563: {name: 'gammaValue', value: DataType.float}
                }
              },

              // Audio
              225: {
                name: 'audio',
                container: {
                  181: {name: 'samplingFrequency', value: DataType.float},
                  30901: {name: 'outputSamplingFrequency', value: DataType.float},
                  159: {name: 'channels', value: DataType.uint}, // https://www.matroska.org/technical/specs/index.html
                  148: {name: 'channels', value: DataType.uint},
                  32123: {name: 'channelPositions', value: DataType.binary},
                  25188: {name: 'bitDepth', value: DataType.uint}
                }
              },

              // Content Encoding
              28032: {
                name: 'contentEncodings',
                container: {
                  25152: {
                    name: 'contentEncoding',
                    container: {
                      20529: {name: 'order', value: DataType.uint},
                      20530: {name: 'scope', value: DataType.bool},
                      20531: {name: 'type', value: DataType.uint},
                      20532: {
                        name: 'contentEncoding',
                        container: {
                          16980: {name: 'contentCompAlgo', value: DataType.uint},
                          16981: {name: 'contentCompSettings', value: DataType.binary}
                        }
                      },
                      20533: {
                        name: 'contentEncoding',
                        container: {
                          18401: {name: 'contentEncAlgo', value: DataType.uint},
                          18402: {name: 'contentEncKeyID', value: DataType.binary},
                          18403: {name: 'contentSignature ', value: DataType.binary},
                          18404: {name: 'ContentSigKeyID  ', value: DataType.binary},
                          18405: {name: 'contentSigAlgo ', value: DataType.uint},
                          18406: {name: 'contentSigHashAlgo ', value: DataType.uint}
                        }
                      },
                      25188: {name: 'bitDepth', value: DataType.uint}
                    }
                  }
                }
              }
            }
          }
        }
      },

      // Cueing Data
      475249515: {
        name: 'cues',
        container: {
          187: {
            name: 'cuePoint',
            container: {
              179: {name: 'cueTime', value: DataType.uid},
              183: {
                name: 'positions',
                container: {
                  247: {name: 'track', value: DataType.uint},
                  241: {name: 'clusterPosition', value: DataType.uint},
                  21368: {name: 'blockNumber', value: DataType.uint},
                  234: {name: 'codecState', value: DataType.uint},
                  219: {
                    name: 'reference', container: {
                      150: {name: 'time', value: DataType.uint},
                      151: {name: 'cluster', value: DataType.uint},
                      21343: {name: 'number', value: DataType.uint},
                      235: {name: 'codecState', value: DataType.uint}
                    }
                  },
                  240: {name: 'relativePosition', value: DataType.uint} // extended
                }
              }
            }
          }
        }
      },

      // Attachment
      423732329: {
        name: 'attachments',
        container: {
          24999: {
            name: 'attachedFiles',
            multiple: true,
            container: {
              18046: {name: 'description', value: DataType.string},
              18030:  {name: 'name', value: DataType.string},
              18016:  {name: 'mimeType', value: DataType.string},
              18012: {name: 'data', value: DataType.binary},
              18094: {name: 'uid', value: DataType.uid}
            }
          }
        }
      },

      // Chapters
      272869232: {
        name: 'chapters',
        container: {
          17849: {
            name: 'editionEntry',
            container: {
              182: {
                name: 'chapterAtom',
                container: {
                  29636: {name: 'uid', value: DataType.uid},
                  145: {name: 'timeStart', value: DataType.uint},
                  146: {name: 'timeEnd', value: DataType.uid},
                  152: {name: 'hidden', value: DataType.bool},
                  17816: {name: 'enabled', value: DataType.uid},
                  143: {name: 'track', container:  {
                    137: {name: 'trackNumber', value: DataType.uid},
                    128: {
                      name: 'display', container: {
                        133: {name: 'string', value: DataType.string},
                        17276: {name: 'language ', value: DataType.string},
                        17278: {name: 'country ', value: DataType.string}
                      }
                    }
                  }
                  }
                }
              }
            }
          }
        }
      },

      // Tagging
      307544935: {
        name: 'tags',
        container: {
          29555: {
            name: 'tag',
            multiple: true,
            container: {
              25536: {
                name: 'target',
                container: {
                  25541: {name: 'tagTrackUID', value: DataType.uid},
                  25540: {name: 'tagChapterUID', value: DataType.uint},
                  25542: {name: 'tagAttachmentUID', value: DataType.uid},
                  25546: {name: 'targetType', value: DataType.string}, // extended
                  26826: {name: 'targetTypeValue', value: DataType.uint}, // extended
                  25545: {name: 'tagEditionUID', value: DataType.uid} // extended
                }
              },
              26568: {
                name: 'simpleTags',
                multiple: true,
                container: {
                  17827: {name: 'name', value: DataType.string},
                  17543: {name: 'string', value: DataType.string},
                  17541: {name: 'binary', value: DataType.binary},
                  17530: {name: 'language', value: DataType.string}, // extended
                  17531: {name: 'languageIETF', value: DataType.string}, // extended
                  17540: {name: 'default', value: DataType.bool} // extended
                }
              }
            }
          }
        }
      }

    }
  }
};
