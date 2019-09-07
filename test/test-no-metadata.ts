import {assert} from 'chai';
import * as mm from '../lib';
import * as path from 'path';

it("should reject files that can't be parsed", async () => {

  const filePath = path.join(__dirname, 'samples', __filename);

  // Run with default options
  try {
    await mm.parseFile(filePath);
    assert.fail('Should reject a file which cannot be parsed');
  } catch (err) {
    assert.isDefined(err);
    assert.isDefined(err.message);
  }
});
