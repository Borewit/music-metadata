var path = require('path'),
    assert = require('./assert-ext');

var fileName = module.parent.filename;
var expected = 0;
var testsRan = 0;
var timeout;

this.__defineSetter__('expected', function(val) {
    expected = val;
});

assert.on('ranTest', function() {
  ranTests(1);
});

function ranTests(ran) {
  testsRan += ran;
  clearTimeout(timeout);
  
  timeout = setTimeout(function() {
    report();
  }, 500);
}
ranTests(0); //do a check now (incase no tests are ran)

function report() {
  function color(text) {
    return (testsRan === expected) ? '\033[32m' + text + '\033[0m' //green
                                   : '\033[31m' + text + '\033[0m'; //red
  }
  
  //report results
  console.log('%s ran %s out of %s tests', path.basename(fileName), 
    color(testsRan), color(expected));
}