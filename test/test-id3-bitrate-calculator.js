var common = require('../lib/common');
var test = require('prova');

// should throw error if version != [1,2,2.5]
// should throw error if layer != [1,2,3]

test('bitrate-calculator', function (t) {
  // version 1, layer 1
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 1, 1), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 1, 1), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 1, 1), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 1, 1), 64);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 1, 1), 96);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 1, 1), 128);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 1, 1), 160);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 1, 1), 192);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 1, 1), 224);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 1, 1), 256);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 1, 1), 288);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 1, 1), 320);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 1, 1), 352);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 1, 1), 384);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 1, 1), 416);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 1, 1), 448);
  // version 1, layer 2
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 1, 2), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 1, 2), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 1, 2), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 1, 2), 48);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 1, 2), 56);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 1, 2), 64);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 1, 2), 80);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 1, 2), 96);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 1, 2), 112);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 1, 2), 128);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 1, 2), 160);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 1, 2), 192);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 1, 2), 224);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 1, 2), 256);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 1, 2), 320);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 1, 2), 384);
  // version 1, layer 3
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 1, 3), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 1, 3), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 1, 3), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 1, 3), 40);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 1, 3), 48);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 1, 3), 56);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 1, 3), 64);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 1, 3), 80);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 1, 3), 96);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 1, 3), 112);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 1, 3), 128);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 1, 3), 160);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 1, 3), 192);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 1, 3), 224);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 1, 3), 256);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 1, 3), 320);
  // version 2, layer 1
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 2, 1), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 2, 1), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 2, 1), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 2, 1), 48);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 2, 1), 56);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 2, 1), 64);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 2, 1), 80);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 2, 1), 96);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 2, 1), 112);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 2, 1), 128);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 2, 1), 144);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 2, 1), 160);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 2, 1), 176);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 2, 1), 192);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 2, 1), 224);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 2, 1), 256);
  // version 2, layer 2
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 2, 2), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 2, 2), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 2, 2), 8);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 2, 2), 16);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 2, 2), 24);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 2, 2), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 2, 2), 40);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 2, 2), 48);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 2, 2), 56);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 2, 2), 64);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 2, 2), 80);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 2, 2), 96);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 2, 2), 112);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 2, 2), 128);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 2, 2), 144);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 2, 2), 160);
  // version 2, layer 3
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 0], 2, 3), 'free');
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 1], 2, 3), 'reserved');
  t.strictEqual(common.id3BitrateCalculator([0, 0, 0, 1], 2, 3), 8);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 0], 2, 3), 16);
  t.strictEqual(common.id3BitrateCalculator([0, 0, 1, 1], 2, 3), 24);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 0], 2, 3), 32);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 0, 1], 2, 3), 40);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 0], 2, 3), 48);
  t.strictEqual(common.id3BitrateCalculator([0, 1, 1, 1], 2, 3), 56);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 0], 2, 3), 64);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 0, 1], 2, 3), 80);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 0], 2, 3), 96);
  t.strictEqual(common.id3BitrateCalculator([1, 0, 1, 1], 2, 3), 112);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 0], 2, 3), 128);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 0, 1], 2, 3), 144);
  t.strictEqual(common.id3BitrateCalculator([1, 1, 1, 0], 2, 3), 160);
  t.end();
})

test('sampling-rate-calculator', function (t) {
  // version 1
  t.strictEqual(common.samplingRateCalculator([0, 0], 1), 44100);
  t.strictEqual(common.samplingRateCalculator([0, 1], 1), 48000);
  t.strictEqual(common.samplingRateCalculator([1, 0], 1), 32000);
  t.strictEqual(common.samplingRateCalculator([1, 1], 1), 'reserved');
  // version 2
  t.strictEqual(common.samplingRateCalculator([0, 0], 2), 22050);
  t.strictEqual(common.samplingRateCalculator([0, 1], 2), 24000);
  t.strictEqual(common.samplingRateCalculator([1, 0], 2), 16000);
  t.strictEqual(common.samplingRateCalculator([1, 1], 2), 'reserved');
  // version 3
  t.strictEqual(common.samplingRateCalculator([0, 0], 2.5), 11025);
  t.strictEqual(common.samplingRateCalculator([0, 1], 2.5), 12000);
  t.strictEqual(common.samplingRateCalculator([1, 0], 2.5), 8000);
  t.strictEqual(common.samplingRateCalculator([1, 1], 2.5), 'reserved');
  t.end();
})