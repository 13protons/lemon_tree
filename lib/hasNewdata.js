const _ = require('lodash');

module.exports = function() {
  var saved = undefined;

  return function (update) {
    let output = {};
    let _update = stripFns(update);
    _.forOwn(_update, function (value, key) {
      if (!saved) {
        _.set(output, key, true);
        return;
      }
      let oldval = _.get(saved, key, undefined);
      // console.log('testing', oldval, value, _.eq(value, oldval))
      _.set(output, key, !_.isEqual(value, oldval));
    });
    saved = _update;
    return output;
  }
}

function stripFns(obj) {
  // scrub function
  let copy = JSON.parse(JSON.stringify(obj));
  _.functionsIn(copy).forEach((keyName) => {
    // console.log('found function', keyName);
    delete copy[keyName];
  })
  return copy;
}