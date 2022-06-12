export interface IEncoder {
  lossy: boolean;
  format: string;
}

export const encoderDict: { [dataFormatId: string]: IEncoder } = {
  raw: {
    lossy: false,
    format: "raw",
  },
  MAC3: {
    lossy: true,
    format: "MACE 3:1",
  },
  MAC6: {
    lossy: true,
    format: "MACE 6:1",
  },
  ima4: {
    lossy: true,
    format: "IMA 4:1",
  },
  ulaw: {
    lossy: true,
    format: "uLaw 2:1",
  },
  alaw: {
    lossy: true,
    format: "uLaw 2:1",
  },
  Qclp: {
    lossy: true,
    format: "QUALCOMM PureVoice",
  },
  ".mp3": {
    lossy: true,
    format: "MPEG-1 layer 3",
  },
  alac: {
    lossy: false,
    format: "ALAC",
  },
  "ac-3": {
    lossy: true,
    format: "AC-3",
  },
  mp4a: {
    lossy: true,
    format: "MPEG-4/AAC",
  },
  mp4s: {
    lossy: true,
    format: "MP4S",
  },
  // Closed Captioning Media, https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-SW87
  c608: {
    lossy: true,
    format: "CEA-608",
  },
  c708: {
    lossy: true,
    format: "CEA-708",
  },
};
