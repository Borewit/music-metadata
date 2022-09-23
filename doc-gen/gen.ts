import { WriteStream, readFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";

import { CombinedTagMapper } from "../lib/common/CombinedTagMapper";
import { commonTags } from "../lib/common/GenericTagInfo";

import { Table, Row } from "./MarkDown";

type ITagInfoDict = Record<string, { description: string }>;

const combinedTagMapper = new CombinedTagMapper();

/**
 *
 * @param nativeType
 * @param commonTag
 * @returns
 */
function getNativeSourceTags(nativeType: string, commonTag: string): string[] {
  const result: string[] = [];

  const tagMapper = combinedTagMapper.tagMappers[nativeType];
  for (const nativeTag of Object.keys(tagMapper.tagMap)) {
    if (commonTag === tagMapper.tagMap[nativeTag]) {
      result.push(nativeTag);
    }
  }
  return result;
}

/**
 *
 * @param out
 */
function write(out: WriteStream) {
  const json = readFileSync(join(__dirname, "common.json"));
  const commonDescriptionDict: ITagInfoDict = JSON.parse(json as unknown as string);

  const table = new Table();

  table.header = new Row(["Common tag", "n", "Description"]);

  for (const nativeType in combinedTagMapper.tagMappers) {
    table.header.values.push(nativeType);
  }

  for (const commonTagKey of Object.keys(commonTags)) {
    const tagInfo = commonDescriptionDict[commonTagKey];
    if (!tagInfo) throw new Error(`${commonTagKey} not found`);
    // console.log('common-tag: key=%s, description=%s', commonTagKey, tagInfo.description)
    const multiplicity = commonTags[commonTagKey].multiple ? "*" : "1";

    const row = new Row([commonTagKey, multiplicity, tagInfo.description]);
    for (const nativeType in combinedTagMapper.tagMappers) {
      row.values.push(getNativeSourceTags(nativeType, commonTagKey).join(", "));
    }
    table.rows.push(row);
  }

  table.writeTo(out);
}

const txt = createWriteStream(join(__dirname, "..", "doc", "common_metadata.md"));

txt.write("# Common Metadata\n\n");
txt.write("Common tags, and _native_ to _common_ tag mappings. _n_ indicates the multiplicity.\n");
txt.write(
  "The tag mapping is strongly inspired on the [MusicBrainz Picard tag-mapping](https://picard.musicbrainz.org/docs/mappings/).\n\n"
);

write(txt);
