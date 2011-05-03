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
  var self = this;
  function color(text) {
    return (self.testsRan === self.expected) ? '\033[32m' + text + '\033[0m' //green
                                             : '\033[31m' + text + '\033[0m'; //red
  }
  
  //report results
  console.log('%s ran %s out of %s tests', path.basename(self.fileName), 
    color(self.testsRan), color(self.expected));
}