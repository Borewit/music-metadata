export type { IFileInfo } from 'strtok3';
export { type IAudioMetadata, type IOptions, type ITag, type INativeTagDict, type ICommonTagsResult, type IFormat, type IPicture, type IRatio, type IChapter, type ILyricsTag, LyricsContentType, TimestampFormat, IMetadataEventTag, IMetadataEvent } from './type.js';

// // CommonJS Node entry point Typing
export const loadMusicMetadata: () => Promise<typeof import('./index.js')>;
