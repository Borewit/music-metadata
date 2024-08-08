import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { commonTags } from '../lib/common/GenericTagTypes.js';
import { CombinedTagMapper } from '../lib/common/CombinedTagMapper.js';

import * as markDown from './MarkDown.js';

interface ITagInfoDict {
  [key: string]: { description: string };
}

const combinedTagMapper = new CombinedTagMapper();
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function getNativeSourceTags(nativeType: string, commonTag: string): string[] {

  const result: string[] = [];

  const tagMapper = combinedTagMapper.tagMappers[nativeType];
  Object.keys(tagMapper.tagMap).forEach(nativeTag => {
    if (commonTag === tagMapper.tagMap[nativeTag]) {
      result.push(nativeTag);
    }
  });
  return result;
}

function write(out: fs.WriteStream) {

  const json = fs.readFileSync(path.join(dirname, 'common.json'), {encoding: 'utf-8'});
  const commonDescriptionDict: ITagInfoDict = JSON.parse(json);

  const table = new markDown.Table();

  table.header = new markDown.Row(['Common tag', 'n', 'Description']);

  for (const nativeType in combinedTagMapper.tagMappers) {
    table.header.values.push(nativeType);
  }

  for (const commonTagKey of Object.keys(commonTags)) {
    const tagInfo = commonDescriptionDict[commonTagKey];
    if (!tagInfo)
      throw new Error(`${commonTagKey} not found`);
    // console.log('common-tag: key=%s, description=%s', commonTagKey, tagInfo.description)
    const multiplicity = commonTags[commonTagKey].multiple ? '*' : '1';

    const row = new markDown.Row([commonTagKey, multiplicity, tagInfo.description]);
    for (const nativeType in combinedTagMapper.tagMappers) {
      row.values.push(getNativeSourceTags(nativeType, commonTagKey).join(', '));
    }
    table.rows.push(row);
  }

  table.writeTo(out);
}

const txt = fs.createWriteStream(path.join(dirname, '..', 'doc', 'common_metadata.md'));

txt.write('# Common Metadata\n\n');
txt.write('Common tags, and _native_ to _common_ tag mappings. _n_ indicates the multiplicity.\n');
txt.write('The tag mapping is strongly inspired on the [MusicBrainz Picard tag-mapping](https://picard.musicbrainz.org/docs/mappings/).\n\n');

write(txt);
