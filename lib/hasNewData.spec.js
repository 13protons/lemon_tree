const chai = require('chai');
const _ = require('lodash');
const expect = chai.expect;
chai.should();

const Diff = require('./hasNewData');

describe('hasNewData', function(){
  describe('init', function(){
    it ('should always return true on first run', function(){
      let differ = new Diff();
      let diff = differ({
        key: 'val'
      })
      diff.key.should.be.true;
    })
  })
  describe('update', function () {
    it('should return false for redundant data', function () {
      let differ = new Diff();
      let diff = differ({
        key: 'val'
      })

      diff = differ({
        key: 'val'
      })
      diff.key.should.be.false;
    })

    it('should ignore functions', function () {
      let differ = new Diff();
      let diff = differ({
        key: 'val',
        doit: function() { return 'holy guacamole'; }
      })

      diff = differ({
        key: 'val',
        doit: function () { return 'unholy guacamole'; }
      })
      
      _.forIn(diff, function (value, key) {
        value.should.be.false;
      })
      
    })
  })
});