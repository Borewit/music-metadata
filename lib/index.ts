import { selectCover } from "./selectCover";
import { parseFromTokenizer } from "./parseFromTokenizer";
import { parseBuffer } from "./parseBuffer";
import { parseStream } from "./parseStream";
import { parseFile } from "./parseFile";

export { selectCover } from "./selectCover";
export { parseFromTokenizer } from "./parseFromTokenizer";
export { parseBuffer } from "./parseBuffer";
export { parseStream } from "./parseStream";
export { parseFile } from "./parseFile";
export { orderTags } from "./orderTags";
export { ratingToStars } from "./ratingToStars";
export { IFileInfo } from "./strtok3/core";

export {
  IAudioMetadata,
  IOptions,
  ITag,
  INativeTagDict,
  ICommonTagsResult,
  IFormat,
  IPicture,
  IRatio,
  IChapter,
} from "./type";

/**
 * Define default module exports
 */
export default {
  parseStream,
  parseFile,
  parseFromTokenizer,
  parseBuffer,
  selectCover,
};
