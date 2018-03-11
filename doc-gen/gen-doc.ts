import {} from "mocha";
import {assert} from "chai";

import * as path from 'path';
import * as fs from "fs";

import {commonTags} from "../lib/common/GenericTagTypes";
import {CombinedTagMapper} from "../src/index";

import * as markDown from "./MarkDown";

type ITagInfoDict = { [key: string]: {description: string}; }

const combinedTagMapper = new CombinedTagMapper();

function getNativeSourceTags(nativeType: string, commonTag: string): string[] {

  const result: string[] = [];

  const tagMapper = combinedTagMapper.tagMappers[nativeType];
  for (const nativeTag in tagMapper.tagMap) {
    if (commonTag === tagMapper.tagMap[nativeTag] ) {
      // console.log("%s <= %s:%s", commonTag, nativeType, nativeTag)
      result.push(nativeTag);
    }
  }
  return result
}

function run() {

  const combinedTagMapper = new CombinedTagMapper();

  const json = fs.readFileSync(path.join(__dirname, 'common.json'));
  const commonDescriptionDict: ITagInfoDict = JSON.parse(json as any);

  const table = new markDown.Table();

  table.header = new markDown.Row(["Common tag", "n", "Description"]);

  const tagTypes: string[] = [];
  for (const nativeType in combinedTagMapper.tagMappers) {
    tagTypes.push(nativeType);
    table.header.values.push(nativeType);
  }


  for (const commonTagKey in commonTags) {
    const tagInfo = commonDescriptionDict[commonTagKey];
    // console.log('common-tag: key=%s, description=%s', commonTagKey, tagInfo.description)
    const multiplicity = commonTags[commonTagKey].multiple ? '*' : '1';

    const row = new markDown.Row([commonTagKey, multiplicity, tagInfo.description]);
    for (const nativeType in combinedTagMapper.tagMappers) {
      row.values.push(getNativeSourceTags(nativeType, commonTagKey).join(", "));
    }
    table.rows.push(row);
  }

  console.log(table.toString())
}

run();

