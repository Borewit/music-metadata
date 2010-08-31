
exports.findZero = function (buffer, start, end) {
  var i = start;
  while (buffer[i] !== 0) {
    if (i >= end) {
      return end;
    }
    i++;
  }
  return i;
};

exports.isBitSetAt = function isBitSetAt (b, offset, bit) {
  return (b[offset] & (1 << bit)) !== 0;
};

exports.getInt24 = function getInt24 (b, offset, big_endian) {
  var byte1 = b[offset],
      byte2 = b[offset + 1],
      byte3 = b[offset + 2];

  var int = big_endian ?
            (((byte1 << 8) + byte2) << 8) + byte3:
            (((byte3 << 8) + byte2) << 8) + byte1;
  if (int < 0) int += 16777216;
  return int;
};
