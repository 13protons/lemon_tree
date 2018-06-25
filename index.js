const SerialPort = require('serialport');
const _ = require('lodash');
const Readline = SerialPort.parsers.Readline;
const events = require('events');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const fs = require('fs');
const path = require('path');
const io = require('socket.io')(server);
const turf = require('@turf/turf');

const logFileName = "GPS_LOG_" + new Date().toString();
const logFilePath = path.resolve('./logs', logFileName);

const tracks = require('./races/tracks.json');

let repeater = new events.EventEmitter();

io.on('connection', function (socket) {
  var listener;
  repeater.on('update', update);
  socket.on('disconnect', function () {
    repeater.removeListener('update', update);
  });
  function update(data) {
    socket.emit('radio_' + data.id, data);
  }

  socket.on('startRecording', function(data) {
    console.log('staring to record');
    // listener = listen();

  })
  socket.on('admin', function(data) {
    console.log('admin message: ', data);
    if (data.msg === 'start') {
      console.log('should start');
      listen(data.portName);
    } else if (data.msg === 'stop') {
      console.log('should stop');
    }
  });
});

repeater.on('update', function(data) {
  fs.appendFile(logFilePath + '.txt', JSON.stringify(data) + '\r\n', (err) => {
    if (err) throw err;
  });
});

app.use(express.static('public'))

app.get('/datafiles', function(req, res, next){
  fs.readdir('./sample_data', function (err, items) {
    if (err) {
      console.log(err);
      return res.status(500).end();
    }
    console.log('directory items', items);
    res.json(items);
  })
})

server.listen(3000);

function listen(portString) {
  portString = portString || '/dev/cu.usbmodem1411'; 
  
  const parseRoutine = [
    ['lat', parseFloat],
    ['lng', parseFloat],
    ['speed', hydrate],
    ['heading', hydrate]
  ];
  
  let port = false;
  try {
    port = new SerialPort(portString, {
      baudRate: 115200
    });
  } catch(err) {
    port = false;
    console.log('could not create serial interface', err);
  }
  if (!port){return;}
  
  let parser = port.pipe(new Readline());


  parser.on('data', function (data) {
    let parsed = {};
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      _.set(parsed, 'id', '-1');
      console.log('problem parsing data', e);
    }

    if (parsed.id === '-1') {
      return;
    }
    _.set(parsed, 'ts', Date.now());
    let sentence = parsed.msg.split(',');
    delete parsed.msg;

    // let parsed = {};
    sentence.forEach((item, index) => {
      let p = parseRoutine[index];
      _.set(parsed, p[0], p[1](item));
    });
    // console.log(parsed);
    repeater.emit('update', parsed)
  });

  port.on('close', parser.end);
  return port;
}

function hydrate(hexVal) {
  let val = parseInt(hexVal, 16);
  return val / 100;
}