
import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("should be able to read id3v2 files with lyrics", () => {

  const filename = 'id3v2-lyrics.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath).then(metadata => {

    t.deepEqual(metadata.common.lyrics, [
      'The way we\'re living makes no sense',
      'Take me back to the age of innocence',
      'I wanna go back then',
      'Take me back to the age of innocence',
      'Back to the age of innocence',
      'When clockwork fixed by lights and books',
      'When singers wrote songs instead of hooks',
      'When the value wasn\'t in the price',
      'When the fight for life was in the civil rights',
      'When we could live life through a screen',
      'When everything you knew was as good as it seems',
      'When the only worry was the concept of sin',
      'When did it begin?',
      'I wonder if I could,',
      'Go back to old Hollywood',
      'When presidents dropped blonde bombshells',
      'Instead of creating the perfect hell',
      'The way we\'re living makes no sense',
      'Take me back to the age of innocence',
      'I wanna go back then',
      'Take me back to the age of innocence',
      'Back to the age of innocence',
      'When pharmaceuticals were there to make life beautiful',
      'When the way that we were born was more than suitable',
      'When everybody thought they could make a difference',
      'And you couldn\'t get your pics within an instance',
      'I wonder if I could,',
      'Go back to old Hollywood',
      'When presidents dropped blonde bombshells',
      'Instead of creating the perfect hell',
      'The way we\'re living makes no sense',
      'Take me back to the age of innocence',
      'I wanna go back then',
      'Take me back to the age of innocence',
      'Back to the age of innocence',
      'I wanna get older, don\'t fight my age',
      'Take me back to those simpler days',
      'I wonder how it all happened',
      'I wanna get older, don\'t fight my age',
      'Don\'t wanna be the shade of a scalpel\'s blade',
      'So please tell me, please tell me',
      'What ever happened? Happened?',
      'I wonder if I could,',
      'Go back to old Hollywood',
      'When presidents dropped blonde bombshells',
      'Instead of creating their lives to hell',
      'The way we\'re living makes no sense',
      'Take me back, take me back',
      'To the age of innocence',
      'I wanna go back then',
      'Take me back, take me back',
      'To the age of innocence',
      'Back to the age of innocence',
      'I wanna get older, don\'t fight my age',
      'Take me back to those simpler days',
      'I wonder how it all happened',
      'I wanna get older, don\'t fight my age',
      'Don\'t wanna be the page on the scalpel\'s blade',
      'So please tell me, please tell me',
      'What ever happened?',
      'Happened?'], 'Check lyrics');
  });

});
