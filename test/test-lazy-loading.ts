import * as mm from '../src';
import * as path from "path";
import {assert} from "chai";
import {Promise} from "es6-promise";

describe("Lazy loading of format parser (ITokenParser", () => {

  it("be able to override the loading method", () => {

    const filePath = path.join(__dirname, "samples", "1971 - 003 - Sweet - Co-Co - CannaPower.mp2");

    return mm.parseFile(filePath, {duration: true, native: true, loadParser: moduleName => {
        assert.strictEqual(moduleName, 'mpeg');
        const parserModule = require('../src/' + moduleName);
        return Promise.resolve(new parserModule.default());
      }
    });
  });

  it("should throw an error if the parser cannot be loaded", () => {

    const filePath = path.join(__dirname, "samples", "1971 - 003 - Sweet - Co-Co - CannaPower.mp2");

    return mm.parseFile(filePath, {duration: true, native: true, loadParser: moduleName => {
        assert.strictEqual(moduleName, 'mpeg');
        return Promise.resolve(undefined);
      }
    }).then(() => {
      assert.fail('Should throw an error');
    }).catch(err => {
      assert.strictEqual(err.message, 'options.loadParser failed to resolve module "mpeg".');
    });
  });

});
