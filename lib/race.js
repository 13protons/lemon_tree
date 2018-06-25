const turf = require('@turf/turf');
const _ = require('lodash');

module.exports = function(locale, vehicle) {
  let history = sampleCache();
  let approachPath = sampleCache();
  let distance = sampleCache(Infinity);
  let race = {
    laps: {
      current: 0,
      last: 0,
      min: Infinity,
      max: -Infinity,
      times: [],
      history: sampleCache(Infinity)
    },
    pit: {
      active: false,
      total: 0,
      last: 0,
      min: Infinity,
      max: -Infinity,
      times: [],
      history: sampleCache(Infinity)
    },
    vehicle: {
      inPit: false,
      distance: 0,
      name: '',
      color: '',
      location: [],
      inApproach: false,
      speed: 0,
      heading: 0
    },
    active: false,
    location: locale,
    approachGeometry: _.find(locale.features, ['properties.name', 'approach']),
    pitGeometry: _.find(locale.features, ['properties.name', 'paddock']),
    startLine: _.find(locale.features, ['properties.name', 'lap']),
    startTime: 0
  }
  _.assign(race.vehicle, vehicle);
  
  return {
    start: start,
    update: update,
    status: status
  }

  function start() {
    race.active = true;
    race.startTime = 1529244627184; //Date.now();
  }

  function update(sample) {
    if (!race.active) {
      return;
    }
    
    history(sample);
    distance([sample.lng, sample.lat]);

    let location = turf.point([sample.lng, sample.lat]);
    let inApproach = contains(location, race.approachGeometry);
    let inPit = contains(location, race.pitGeometry) && sample.speed < .1 && race.laps.current > 0;

    let wasInApproach = _.get(race, 'vehicle.inApproach');
    let wasInPit = _.get(race, 'vehicle.inPit');

    if (inPit && !wasInPit) {
        race.pit.history({
          lap: race.laps.current,
          event: 'start',
          sample: sample
      })
    } else if (wasInPit && !inPit) {
      race.pit.history({
        lap: race.laps.current,
        event: 'end',
        sample: sample
      })
      calculatePitStats();
    }

    if (inApproach) {
      approachPath(sample);
    } else if (wasInApproach) {
      approachPath(sample);

      let approachPoints = approachPath().map((coord)=>{
        return [coord.lng, coord.lat]
      });

      let pathOfTravel = turf.lineString(approachPoints);
      let intersects = turf.lineIntersect(pathOfTravel, race.startLine);
      let intersection = _.get(intersects, 'features[0].geometry.coordinates');
      
      if (intersection) {
        let before = approachPath()[0];
        let after = approachPath()[1];

        let rewindPercentage = (after.lng - intersection[0])/(after.lng - before.lng);

        let lapPoint = {
          ts: rewind(after.ts, before.ts, rewindPercentage),
          speed: rewind(after.speed, before.speed, rewindPercentage),
          heading: rewind(after.heading, before.heading, rewindPercentage),
          lng: intersection[0],
          lat: intersection[1],
        }
        
        race.laps.history(lapPoint);
        calculateLapStats();

        approachPath.reset();
      }
    }

    // check for pit
    // check for approach
    // update laps
    _.set(race, 'vehicle.inPit', inPit);
    _.set(race, 'pit.active', inPit);

    _.set(race, 'vehicle.location', location);
    _.set(race, 'vehicle.speed', sample.speed);
    _.set(race, 'vehicle.heading', sample.heading);
    _.set(race, 'vehicle.inApproach', inApproach);

    // total distance traveled;
    if (distance().length > 1) {
      _.set(
        race, 
        'vehicle.distance',
        turf.length(turf.lineString(distance()))
        );
    }

    // update vehicle
    // console.log("in approach?", inApproach);
    // console.log("in pit?", inPit);

    // console.log('sample', sample);
    // console.log('status', status());
    return status();
  }

  function status() {
    return {
      laps: race.laps,
      pit: race.pit,
      vehicle: race.vehicle,
      active: race.active,
      startTime: race.startTime
    }
  }

  function calculatePitStats() {
    let events = race.pit.history();
    race.pit.total = events.length / 2;
    let duration = _.get(events[0], 'sample.ts') - _.get(events[1], 'sample.ts');

    race.pit.times.push(duration);
    _.set(race, 'pit.last', duration);
    if (duration < race.pit.min) {
      _.set(race, 'pit.min', duration);
    }
    if (duration > race.pit.max) {
      _.set(race, 'pit.max', duration);
    }
  }

  function calculateLapStats() {
    let laps = race.laps.history();
    let lapTime;
    if (laps.length < 2) {
      return;
    } else {
      lapTime = laps[0].ts - laps[1].ts;
    }

    if (lapTime < race.laps.min) {
      _.set(race, 'laps.min', lapTime);
    }
    if (lapTime > race.laps.max) {
      _.set(race, 'laps.max', lapTime);
    }

    race.laps.times.push(lapTime);
    _.set(race, 'laps.last', lapTime);
    _.set(race, 'laps.current', laps.length - 1);
  }

}

function sampleCache(max) {
  max = max || 20;
  let items = [];
  let adder = function (item) {
    if (item) {
      items.unshift(item);
      if (items.length > max) { items.pop() }
    }
    return items;
  }
  adder.reset = function() {
    items = [];
  }
  return adder;
}

function contains(test, container) {
  return turf.booleanWithin(test, container);
}

function rewind(propA, propB, percent) {
  return propA - ((propA - propB) * percent);
}