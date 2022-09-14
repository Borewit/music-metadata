import { parseBuffer } from "./parseBuffer";
import { parseFile } from "./parseFile";
import { parseFromTokenizer } from "./parseFromTokenizer";
import { parseStream } from "./parseStream";
import { selectCover } from "./selectCover";

export { selectCover } from "./selectCover";
export { parseFromTokenizer } from "./parseFromTokenizer";
export { parseBuffer } from "./parseBuffer";
export { parseStream } from "./parseStream";
export { parseFile } from "./parseFile";
export { orderTags } from "./orderTags";
export { ratingToStars } from "./ratingToStars";
export { IFileInfo } from "./strtok3";

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
