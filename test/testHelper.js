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
    //report results
    function color(text) {
      return (self.testsRan === self.expected) ? '\033[32m' + text + '\033[0m' //green
                                               : '\033[31m' + text + '\033[0m'; //red
    }

    console.log('%s ran %s out of %s tests', 
      path.basename(self.fileName), color(self.testsRan), color(self.expected));
  }, 500);
}