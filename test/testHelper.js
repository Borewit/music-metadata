var path = require('path');

var TestHelper = module.exports =  function(expected, fileName) {
  this.fileName = fileName;
  this.expected = expected;
  this.testsRan = 0;
  this.ranTests(0); //do a check now
}

TestHelper.prototype.ranTests = function(testsRan) {
  this.testsRan += testsRan;
  clearTimeout(this.timeout);
  
  var self = this;
  this.timeout = setTimeout(function() {
    self.report();
  }, 500);
}

TestHelper.prototype.report = function() {
  function red(str) {
    return '\033[31m' + str + '\033[0m';
  }
  function green(str) {
    return '\033[32m' + str + '\033[0m';
  }
  if (this.testsRan !== this.expected) {
    console.log(path.basename(this.fileName) + ' ran ' + red(this.testsRan) + ' out of ' + red(this.expected) + ' tests');
  } else {
    console.log(path.basename(this.fileName) + ' ran ' + green(this.testsRan) + ' out of ' + green(this.expected) + ' tests');
  }
}