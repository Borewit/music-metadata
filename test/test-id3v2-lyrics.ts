import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import { LyricsContentType } from '../lib/core.js';

it("should be able to read id3v2 files with lyrics", () => {

  const filename = 'id3v2-lyrics.mp3';
  const filePath = path.join(samplePath, filename);

  const expectedSyncText = [
    {
      text: "The way we're living makes no sense",
      timestamp: 10
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 3780
    },
    {
      text: "I wanna go back then",
      timestamp: 7540
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 11310
    },
    {
      text: "Back to the age of innocence",
      timestamp: 15070
    },
    {
      text: "When clockwork fixed by lights and books",
      timestamp: 30440
    },
    {
      text: "When singers wrote songs instead of hooks",
      timestamp: 34410
    },
    {
      text: "When the value wasn't in the price",
      timestamp: 37170
    },
    {
      text: "When the fight for life was in the civil rights",
      timestamp: 40540
    },
    {
      text: "When we could live life through a screen",
      timestamp: 43100
    },
    {
      text: "When everything you knew was as good as it seems",
      timestamp: 46070
    },
    {
      text: "When the only worry was the concept of sin",
      timestamp: 49440
    },
    {
      text: "When did it begin?",
      timestamp: 53000
    },
    {
      text: "I wonder if I could,",
      timestamp: 55770
    },
    {
      text: "Go back to old Hollywood",
      timestamp: 58530
    },
    {
      text: "When presidents dropped blonde bombshells",
      timestamp: 62700
    },
    {
      text: "Instead of creating the perfect hell",
      timestamp: 66470
    },
    {
      text: "The way we're living makes no sense",
      timestamp: 69030
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 72800
    },
    {
      text: "I wanna go back then",
      timestamp: 75560
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 78730
    },
    {
      text: "Back to the age of innocence",
      timestamp: 92700
    },
    {
      text: "When pharmaceuticals were there to make life beautiful",
      timestamp: 97260
    },
    {
      text: "When the way that we were born was more than suitable",
      timestamp: 100830
    },
    {
      text: "When everybody thought they could make a difference",
      timestamp: 104190
    },
    {
      text: "And you couldn't get your pics within an instance",
      timestamp: 106560
    },
    {
      text: "I wonder if I could,",
      timestamp: 110130
    },
    {
      text: "Go back to old Hollywood",
      timestamp: 113290
    },
    {
      text: "When presidents dropped blonde bombshells",
      timestamp: 117260
    },
    {
      text: "Instead of creating the perfect hell",
      timestamp: 120820
    },
    {
      text: "The way we're living makes no sense",
      timestamp: 123590
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 127360
    },
    {
      text: "I wanna go back then",
      timestamp: 130720
    },
    {
      text: "Take me back to the age of innocence",
      timestamp: 133090
    },
    {
      text: "Back to the age of innocence",
      timestamp: 136850
    },
    {
      text: "I wanna get older, don't fight my age",
      timestamp: 146420
    },
    {
      text: "Take me back to those simpler days",
      timestamp: 151790
    },
    {
      text: "I wonder how it all happened",
      timestamp: 158350
    },
    {
      text: "I wanna get older, don't fight my age",
      timestamp: 163520
    },
    {
      text: "Don't wanna be the shade of a scalpel's blade",
      timestamp: 167680
    },
    {
      text: "So please tell me, please tell me",
      timestamp: 170050
    },
    {
      text: "What ever happened? Happened?",
      timestamp: 178420
    },
    {
      text: "I wonder if I could,",
      timestamp: 180580
    },
    {
      text: "Go back to old Hollywood",
      timestamp: 182550
    },
    {
      text: "When presidents dropped blonde bombshells",
      timestamp: 185310
    },
    {
      text: "Instead of creating their lives to hell",
      timestamp: 188480
    },
    {
      text: "The way we're living makes no sense",
      timestamp: 191650
    },
    {
      text: "Take me back, take me back",
      timestamp: 194410
    },
    {
      text: "To the age of innocence",
      timestamp: 196180
    },
    {
      text: "I wanna go back then",
      timestamp: 198340
    },
    {
      text: "Take me back, take me back",
      timestamp: 200310
    },
    {
      text: "To the age of innocence",
      timestamp: 202080
    },
    {
      text: "Back to the age of innocence",
      timestamp: 204640
    },
    {
      text: "I wanna get older, don't fight my age",
      timestamp: 207010
    },
    {
      text: "Take me back to those simpler days",
      timestamp: 208970
    },
    {
      text: "I wonder how it all happened",
      timestamp: 210740
    },
    {
      text: "I wanna get older, don't fight my age",
      timestamp: 213910
    },
    {
      text: "Don't wanna be the page on the scalpel's blade",
      timestamp: 215870
    },
    {
      text: "So please tell me, please tell me",
      timestamp: 217640
    },
    {
      text: "What ever happened?",
      timestamp: 220600
    },
    {
      text: "Happened?",
      timestamp: 224370
    }
  ];

  return mm.parseFile(filePath).then(metadata => {

    assert.isDefined(metadata.common.lyrics, 'metadata.common.lyrics');
    assert.strictEqual(metadata.common.lyrics.length, 1, 'metadata.common.lyrics.length');
    const lyrics = metadata.common.lyrics[0];

    assert.strictEqual(lyrics.descriptor, '', 'metadata.common.lyrics[0].descriptor');
    assert.strictEqual(lyrics.contentType, LyricsContentType.lyrics, 'metadata.common.lyrics[0].contentType');
    assert.strictEqual(lyrics.language, 'eng', 'metadata.common.lyrics[0].language');
    assert.deepEqual(lyrics.syncText, expectedSyncText, 'metadata.common.lyrics[0].synchronized');
  });

});
