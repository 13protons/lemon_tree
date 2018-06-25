const fs = require('fs');
const path = require('path');

const RaceModel = require('./lib/race.js');
const trackGeometry = require('./lib/testData/track.json');
const approach = loadTelemetry(path.resolve(__dirname, './sample_data', 'Neighborhood_Laps_Sun_Jun_17_2018_10-10-24_GMT-0400_(EDT).txt'));

const testVehicle = {
  name: 'Ghost Rider',
  color: 'transparent'
}

var race = new RaceModel(trackGeometry, testVehicle);
race.start();
approach.forEach(race.update);
console.log(race.status());

function loadTelemetry(fname) {
  var string = fs.readFileSync(fname, { encoding: 'utf8' });
  // console.log('got file', string);
  return string.split('\n').map(JSON.parse);
}