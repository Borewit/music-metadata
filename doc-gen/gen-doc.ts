import {} from "mocha";
import {assert} from "chai";

import * as path from 'path';
import * as fs from "fs";

import {commonTags, isSingleton} from "../lib/common/GenericTagTypes";
import {CombinedTagMapper} from "../src/index";

import * as markDown from "./MarkDown";

type ITagInfoDict = { [key: string]: {description: string}; }


function run() {

  const combinedTagMapper = new CombinedTagMapper();

  // Read Synchrously
  const json = fs.readFileSync(path.join(__dirname, 'common.json'));
  const commonDescriptionDict: ITagInfoDict = JSON.parse(json as any);

  const table = new markDown.Table();

  table.header = new markDown.Row(["Common tag", "n", "Description"]);

  for (const commonTagKey in commonTags) {
    const tagInfo = commonDescriptionDict[commonTagKey];
    // console.log('common-tag: key=%s, description=%s', commonTagKey, tagInfo.description)
    const multiplicity = commonTags[commonTagKey].multiple ? '*' : '1';
    table.rows.push(new markDown.Row([commonTagKey, multiplicity, tagInfo.description]));
  }

  console.log(table.toString())

  /*
  // for each tag type
  for (const nativeType in combinedTagMapper.tagMappers) {
    const tagMapper = combinedTagMapper.tagMappers[nativeType];
    for (const nativeTag in tagMapper.tagMap) {
      const commonType = tagMapper.tagMap[nativeTag];
      t.isDefined(commonTags[commonType], "Unknown common tagTypes in mapping " + nativeType + "." + nativeTag + " => " + commonType);
    }
  }*/

}

run();

