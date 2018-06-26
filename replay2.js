const _ = require('lodash');
const events = require('events');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const fs = require('fs');
const path = require('path');
const io = require('socket.io')(server);
const LineByLineReader = require('line-by-line');

const RaceModel = require('./lib/race.js');
const Diff = require('./lib/hasNewData');

const trackGeometry = require('./lib/testData/track.json');
const testVehicle = {
  name: 'Ghost Rider',
  color: 'transparent'
}
var race = new RaceModel(trackGeometry, testVehicle);
let repeater = new events.EventEmitter();

let objCache = {
  laps: Diff(),
  vehicle: Diff(),
  pit: Diff()
}

var inputFileName = './sample_data/Neighborhood_Laps_Sun_Jun_17_2018_10-10-24_GMT-0400_(EDT).txt';
let lr = new LineByLineReader(inputFileName);
lr.pause();

setTimeout(function () {
  race.start();
  lr.resume();
}, 2000)


lr.on('error', function (err) {
  console.error('problem reading line', err)
});

lr.on('line', function (line) {
  lr.pause();

  // console.log('got a line', line);
  let parsed = {};

  try {
    parsed = JSON.parse(line);
  } catch (e) {
    _.set(parsed, 'id', '-1');
    console.log('problem parsing data', e);
  }

  race.update(parsed);
  let stats = race.status();
  repeater.emit('update', stats)

  setTimeout(function () {
    // ...and continue emitting lines.
    lr.resume();
  }, 250);
});

lr.on('end', function () {
  console.log('done reading');
});

io.on('connection', function (socket) {
  repeater.on('update', update);
  socket.on('disconnect', function () {
    repeater.removeListener('update', update);
  });
  function update(data) {
    // console.log('new status data', data);
    _.forIn(objCache, (cache, key)=>{
      let hasNew = cache(data[key]);
      
      if (_.some(hasNew, _.identity)) {
        // console.log('got a new', key);
        socket.emit(key, data[key]);
      }
    })
    
  }
});

app.use(express.static('public'))
app.use('/data', express.static('races'))

server.listen(3000);

