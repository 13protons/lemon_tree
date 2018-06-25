const _ = require('lodash');
const events = require('events');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const fs = require('fs');
const path = require('path');
const io = require('socket.io')(server);
const LineByLineReader = require('line-by-line');

let repeater = new events.EventEmitter();

var inputFileName = './sample_data/Neighborhood_Laps_Sun_Jun_17_2018_10-10-24_GMT-0400_(EDT).txt';
let lr = new LineByLineReader(inputFileName);
lr.pause();

setTimeout(function() {
  lr.resume();
}, 5000)


lr.on('error', function (err) {
  console.error('problem reading line', err)
});

lr.on('line', function (line) {
  lr.pause();

  console.log('got a line', line);
  let parsed = {};
  
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    _.set(parsed, 'id', '-1');
    console.log('problem parsing data', e);
  }

  repeater.emit('update', parsed)

  setTimeout(function () {
    // ...and continue emitting lines.
    lr.resume();
  }, 1000);
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
    socket.emit('radio_' + data.id, data);
  }
});

app.use(express.static('public'))

server.listen(3000);


