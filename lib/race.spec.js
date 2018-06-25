const chai = require('chai');
const fs = require('fs');
const path = require('path');
chai.should();

const RaceModel = require('./race');
const trackGeometry = require('./testData/track.json');
const approach = loadTelemetry(path.resolve(__dirname, './testData', 'approach.txt'));

const testVehicle = {
  name: 'Ghost Rider',
  color: 'transparent'
}

describe('race', function() {
  describe('signature', function() {
    var race;
    beforeEach(function() {
      race = new RaceModel(trackGeometry, testVehicle);
    })

    it('should have a start method', function() {
      race.start.should.be.a('function');
    })
    it('should have an update method', function () {
      race.update.should.be.a('function');
    })
    it('should have a status method', function () {
      race.status.should.be.a('function');
    })
  })
  
  describe('laps', function() {
    var race = new RaceModel(trackGeometry, testVehicle);
    race.start();
    approach.forEach(race.update);
    
    it('should inherit locale', function() {
      

    })
  })

})

function loadTelemetry(fname) {
  var string = fs.readFileSync(fname, {encoding: 'utf8'});
  return string.split('\n').map(JSON.parse);
}