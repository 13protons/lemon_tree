const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const turf = require('@turf/turf');

const dataSet = require(path.resolve('./', 'races/features.json'));

let locations = _.filter(
  dataSet.features, 
  ['properties.type', 'location']
);

locations = locations.map(function(locale){
  return  {
    name: _.get(locale, 'properties.name'),
    self: locale,
    center: turf.centroid(locale),
    envelope: turf.envelope(locale),
    features: _.filter(dataSet.features, (feature)=>{
      return turf.booleanContains(locale, feature);
    })
  }
});

fs.writeFile(
  path.resolve('./', 'races/tracks.json'), 
  JSON.stringify(locations), 
  (err)=>{
    if (err) {
      return console.error('problem writing', err);
    }
    console.log('it worked!');
  }
);


