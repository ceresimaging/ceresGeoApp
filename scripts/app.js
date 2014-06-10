Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};
Number.prototype.toDegrees = function() {
  return this * 180 / Math.PI;
};
Number.prototype.toFeet = function() {
  return this * 3.28084;
};
Number.prototype.toMeters = function() {
  return this * 0.3048;
};

function App(){

  var app = this;
  // gmaps
  var map = new GMaps({div: '#map',
                       lat: -12,
                       lng: -77,
                       zoom: 10,
                       mapType: 'HYBRID', disableDefaultUI: true});

  map.addControl({
    position: 'top_right',
    content: 'Follow',
    id: 'follow-control',
    style: {
      width: '100px',
      height: '30px',
      fontSize: '22px',
      margin: '5px',
      padding: '1px 6px',
      border: 'solid 1px #717b87',
      background: 'lightblue'
    },
    events: {
      click: function(){
        if (app.follow){
          app.follow = false;
          $(this).css('background', 'white');
        } else {
          app.follow = true;
          $(this).css('background', 'lightblue');
        }
      }
    }
  });
  var currentMarkerIcon =  {path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                 scale: 7,
                 anchor: new google.maps.Point(0, 4),
                 strokeColor: '#55efcb',
                 rotation: '0'};
  var currentMarker = map.createMarker({ lat: -12, lng: -77, icon: currentMarkerIcon});

  this.map = map;

  function errorCallback(){
  }
  // algorithm from Moveable Type
  // www.movable-type.co.uk/scripts/latlong.html
  // returns KM
  function getPntDist(a, b){
    var R = 6371;
    var lat1 = a.coords.latitude;
    var lat2 = b.coords.latitude;
    var lng1 = a.coords.longitude;
    var lng2 = b.coords.longitude;

    var dLat = (lat2 - lat1).toRad();
    var dLng = (lng2 - lng1).toRad();
    a = Math.sin(dLat / 2) * Math.sin(dLat /2) +
            Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  }

  // algorithm from Moveable Type
  // www.movable-type.co.uk/scripts/latlong.html
  // returns RAD
  function getBearing(a, b){
    var lat1 = a.coords.latitude.toRad();
    var lat2 = b.coords.latitude.toRad();
    var lng1 = a.coords.longitude.toRad();
    var lng2 = b.coords.longitude.toRad();
    var y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    var brng = Math.atan2(y, x);
    return brng;
  }

  // algorithm from Moveable Type
  // www.movable-type.co.uk/scripts/latlong.html
  // returns KM
  function getTrackDist(a, b, curr){
    var R = 6371;
    var dist13 = getPntDist(a, curr);
    var brng13 = getBearing(a, curr);
    var brng12 = getBearing(a, b);
    var crossDist = Math.asin(Math.sin(dist13 / R ) * Math.sin(brng13 - brng12)) * R;
    return crossDist;
  }

  // get destination from bearing and start point
  // returns DEGREES
  function getDestPoint(pnt, bearing, dist){
    var R = 6371;
    var lat = pnt.coords.latitude.toRad();
    var lng = pnt.coords.longitude.toRad();
    var lat2 = Math.asin(Math.sin(lat) * Math.cos(dist/R) +
                         Math.cos(lat) * Math.sin(dist/R) * Math.cos(bearing));
    var lng2 = lng + Math.atan2(Math.sin(bearing) * Math.sin(dist/R) * Math.cos(lat),
                         Math.cos(dist/R) - Math.sin(lat) * Math.sin(lat2));
    return [lat2.toDegrees(), lng2.toDegrees()];
  }

  // get extended point a to b, 2km
  // returns DEGREES
  function getExtendedPoint(a, b){
    var brng = getBearing(b, a);
    return getDestPoint(a, brng, 2);
  }

  // removes polyline and adds one
  function drawLine(){
    var pntA = getExtendedPoint(app.posA, app.posB);
    var pntB = getExtendedPoint(app.posB, app.posA);
    var path = [pntA, pntB];
    if (app.pathLine){
      app.pathLine.setPath([{lat: pntA[0], lng: pntA[1]}, {lat: pntB[0], lng: pntB[1]}]);
      app.pathLine.setVisible(true);
    }
    else {
      app.pathLine = map.drawPolyline({
        path: path,
        strokeColor: '#ff2d55',
        strikeOpacity: 1,
        strokeWeight: 6
      });
    }
  }

  // move posA and posB
  // dir == 1 or -1 for directions
  function movePoints(dist, dir){
    var brng = getBearing(app.posA, app.posB);
    var newBrng = brng + (Math.PI/2)*dir;
    var latA = getDestPoint(app.posA, newBrng, dist)[0];
    var lngA = getDestPoint(app.posA, newBrng, dist)[1];
    var latB = getDestPoint(app.posB, newBrng, dist)[0];
    var lngB = getDestPoint(app.posB, newBrng, dist)[1];
    app.posA = { coords: { latitude: latA, longitude: lngA } };
    app.posB = { coords: { latitude: latB, longitude: lngB } };
  }

  // low pass filter
  function filterPos(position, prev, gamma){
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    var prevLat = prev.coords.latitude;
    var prevLng = prev.coords.longitude;
    var newLat = lat*gamma + prevLat*(1 - gamma);
    var newLng = lng*gamma + prevLng*(1 - gamma);
    return {
      coords:{
        latitude: newLat,
        longitude: newLng
      }
    }
  }


  this.watchID = null;
  this.posCurrent = null;
  this.posPrevious = null;
  this.posA = null;
  this.posB = null;
  this.trackDist = null;
  this.moveDist = ((850).toMeters())/1000;
  this.follow = true;
  this.heading = null;
  this.pathLine = null;
  this.FILTER_GAMMA = 0.7;

  this.addCurrentMarker = function(){
    currentMarker = map.createMarker({ lat: -12, lng: -77, icon: currentMarkerIcon});
    map.addMarker(currentMarker);
  }

  this.moveLine = function(dir) {
    if (app.posA && app.posB){
      movePoints(app.moveDist, dir);
      drawLine();
    }
  };

  this.getLocationA = function() {
    // navigator.geolocation.getCurrentPosition(function(position){
    //   app.posA = filterPos(position, app.posPrevious, app.FILTER_GAMMA);
      app.posA = app.posCurrent;
      if (app.pathLine)
        app.pathLine.setVisible(false);
    // }, errorCallback, { enableHighAccuracy: true });
  };

  this.getLocationB = function() {
    // navigator.geolocation.getCurrentPosition(function(position){
    //   app.posB = filterPos(position, app.posPrevious, app.FILTER_GAMMA);
      app.posB = app.posCurrent;
      if (app.posA) {
        drawLine();
      }
    // }, errorCallback, { enableHighAccuracy: true });
  };

  this.watchCompass = function() {
    var trackDist;
    var bearing;
    var angleDiff;
    Compass.watch(function(heading){
      if (app.posPrevious, app.posCurrent){
        if (getBearing(app.posPrevious, app.posCurrent).toDegrees() !== 0){
          // over ground calculated heading
          app.heading = getBearing(app.posPrevious, app.posCurrent).toDegrees();
          heading = app.heading;
        } else {
          // compass heading
          app.heading = heading;
          if (window.orientation === 90){
            heading += 90;
          } else if (window.orientation === -90){
            heading -= 90;
          } else if (window.orientation === 180){
            heading += 180;
          }
          if (heading > 360){
            heading-=360;
          }
        }
      }

      currentMarkerIcon.rotation = heading;
      currentMarker.set('icon', currentMarkerIcon);

      // track dist calculate
      if (app.posA && app.posB){
        bearing = getBearing(app.posA, app.posB).toDegrees();
        if (bearing < 0){
          bearing = 360 + bearing;
        }
        trackDist = getTrackDist(app.posA, app.posB, app.posCurrent);
        angleDiff = Math.abs(heading - bearing) % 360;
        angleDiff = angleDiff > 180 ? 360-angleDiff : angleDiff;
        if (angleDiff > 90 ){
          app.trackDist = trackDist*-1;
        } else {
          app.trackDist = trackDist;
        }
      }
    });
  };

  this.watchLocation = function() {
    map.addMarker(currentMarker);
    window.setInterval(getPosition, 300);
    function getPosition(){
      navigator.geolocation.getCurrentPosition(function(position){
        var lat = position.coords.latitude;
        var long = position.coords.longitude;
        if (app.posPrevious && app.posCurrent){
          position = filterPos(position, app.posPrevious, app.FILTER_GAMMA);
          lat = position.coords.latitude;
          long = position.coords.longitude;
          if (lat != app.posPrevious.coords.latitude || long != app.posPrevious.coords.longitude){
            app.posPrevious = app.posCurrent;
            app.posCurrent = filterPos(position, app.posPrevious, app.FILTER_GAMMA);
          }
          if (app.follow){
            // set map center
            map.setCenter(app.posCurrent.coords.latitude, app.posCurrent.coords.longitude);
          }

          // update current marker position
          currentMarker.setPosition({lat: app.posCurrent.coords.latitude,
                                     lng: app.posCurrent.coords.longitude});

          $(app).trigger('move',
                        [app.posCurrent,
                         app.posA,
                         app.posB,
                         app.trackDist]
                        );
        } else {
          app.posPrevious = position;
          app.posCurrent = position;
        }

      }, errorCallback, { enableHighAccuracy: true });
    }
    // navigator.watchPosition(function(position){
    //     var lat = position.coords.latitude;
    //     var long = position.coords.longitude;
    //     app.posCurrent = position;
    //
    //     // set map center
    //     map.setCenter(lat, long);
    //
    //     // update current marker position
    //     currentMarker.setPosition({lat: lat, lng: long});
    //
    //     $(app).trigger('move',
    //                   [app.posCurrent,
    //                    app.posA,
    //                    app.posB,
    //                    app.trackDist]
    //                   );
    //
    // }, errorCallback, { enableHighAccuracy: true });
  };

}

//range slider
function Slider(app){
  var $menu = $('#menu-bar');
  var $sliderContain = $menu.find('#slider-container');
  var $slider = $menu.find('#slider');
  var $dist = $menu.find('#shift-distance');
  this.init = function(){
    $slider.on('input', function(){
      $dist.html($(this).val()+'ft');
      app.moveDist = parseInt($(this).val()).toMeters()/1000;
    });
    $menu.on('tapstart', '#shift-button', function(){
      $sliderContain.toggle();
      $(this).toggleClass('btn-negative');
    });
  };
}

// Flight paths geojson loading
function FlightPaths(app){
  var self = this;

  // add geojson to map
  this.addMarkers = function(flightName){
    app.map.map.data.loadGeoJson('flights/' + flightName + '.json');
    app.map.map.data.setStyle({
      strokeColor: 'red',
      fillOpacity: 0
    });
    app.map.map.data.addListener('click', function(e){
      self.flyTo = e.latLng;
      self.lineToVisible = true;
      $('#flight-control').css('background', 'lightblue');
      drawLine();
    });
    $(app).on('move', function(e, posCurrent){
      if (self.flyTo)
        drawLine();
    });
  }

  function drawLine() {
    var cur = app.posCurrent.coords;
    var path = [[self.flyTo.lat(), self.flyTo.lng()], [cur.latitude, cur.longitude]];
    if (self.lineTo){
      if (self.lineToVisible){
        self.lineTo.setPath([{ lat: self.flyTo.lat(), lng: self.flyTo.lng()}, {lat: cur.latitude, lng: cur.longitude}]);
        self.lineTo.setVisible(true);
      } else {
        self.lineTo.setVisible(false);
      }
    } else {
      self.lineTo = app.map.drawPolyline({
        path: path,
        strokeColor: 'yellow',
        strikeOpacity: 1,
        strokeWeight: 6
      });
    }
  }

  this.markerVisible = true;
  this.flyTo = null;
  this.lineTo = null;
  this.lineToVisible = true;

  this.init = function(){
    var self = this;
    app.map.addControl({
      position: 'top_right',
      content: 'Markers',
      id: 'marker-control',
      style: {
        width: '100px',
        height: '30px',
        fontSize: '22px',
        margin: '5px',
        padding: '1px 6px',
        border: 'solid 1px #717b87',
        background: 'lightblue'
      },
      events: {
        click: function(){
          if (self.markerVisible){
            app.map.map.data.setStyle({
              visible: false,
            });
            self.markerVisible = false;
            $(this).css('background', 'white');
          } else {
            app.map.map.data.setStyle({
              visible: true,
              strokeColor: 'red',
              fillOpacity: 0
            });
            self.markerVisible = true;
            $(this).css('background', 'lightblue');
          }
        }
      }
    });
    app.map.addControl({
      position: 'top_right',
      content: 'flight-line',
      id: 'flight-control',
      style: {
        width: '130px',
        height: '30px',
        fontSize: '22px',
        margin: '5px',
        padding: '1px 6px',
        border: 'solid 1px #717b87',
        background: 'lightblue'
      },
      events: {
        click: function(){
          if (self.lineToVisible){
            $(this).css('background', 'white');
            self.lineToVisible = false;
          } else {
            $(this).css('background', 'lightblue');
            self.lineToVisible = true;
          }
        }
      }
    })
  };

  this.init();

}


$(function(){

  // location data
  var $position = $('#position');
  var $positionDisplay = $('#position-display');
  var $map = $('#map');
  var $passNum = $('#pass-number');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');
  var $arrow = $('#arrow-icon');
  var $nextPass = $('#next-pass');
  var $prevPass = $('#prev-pass');
  var $trackDist = $('#track-dist');
  var $gamma = $('#gamma-popover');
  var $flightBtn = $('.flight-button');
  var $flightModal = $('#flight-modal');
  var passNum = 1;
  function parsePoint(point) {
    if (point){
      var str = point.coords.latitude.toFixed(5) +
                ' : ' + point.coords.longitude.toFixed(5);
      return str;
    }
  }
  function shrinkMap(){
    $positionDisplay.addClass('enlarge');
    $map.addClass('shrink');
    google.maps.event.trigger(map, "resize");
  }
  function enlargeMap(){
    $positionDisplay.removeClass('enlarge');
    $map.removeClass('shrink');
    google.maps.event.trigger(map, "resize");
  }

  // start app
  var app = new App();
  // start location watch
  app.watchLocation();
  // start compass watch
  app.watchCompass();
  // stop follow on swipe
  $('#map').swipe(function(){
    if (app.follow){
      $('#follow-control').trigger('click');
    }
  })
  $btnA.tapstart(function(e){
    e.preventDefault();
    $btnA.addClass('btn-negative');
    app.getLocationA();
    $btnB.removeClass('btn-negative');
    app.posB = null;
    passNum = 1;
    $passNum.html(passNum);
  });
  $btnB.tapstart(function(e){
    e.preventDefault();
    if (app.posB === null && $btnA.hasClass('btn-negative')){
      shrinkMap();
      $btnB.addClass('btn-negative');
      app.getLocationB();
    }
    passNum = 1;
    $passNum.html(passNum);
  });
  $map.tapstart(function(e){
    enlargeMap();
  });
  $positionDisplay.tapstart(function(e){
    shrinkMap();
  });
  $gamma.find('input').on('change', function(e){
    app.FILTER_GAMMA = $(this).val();
  });
  $(app).on('move', function(e, posCurrent, posA, posB, trackDist, heading) {
    var distStr = Math.abs(trackDist * 1000).toFeet().toFixed(0); + 'ft';
    $position.html(parsePoint(posCurrent));
    // $pntA.html(parsePoint(posA));
    // $pntB.html(parsePoint(posB));
    if (trackDist < 0){
      if ($arrow.hasClass('icon-left')){
        $arrow.removeClass('icon-left').addClass('icon-right');
      }
      $trackDist.html(distStr+' R');
    } else {
      if ($arrow.hasClass('icon-right')){
        $arrow.removeClass('icon-right').addClass('icon-left');
      }
      $trackDist.html(distStr+' L');
    }
  });

  // move line buttons
  $nextPass.on('tapstart', function(){
    shrinkMap();
    if ($('span.toggle').hasClass('active')){
      app.moveLine(1);
    } else{
      app.moveLine(-1);
    }
    if ($pntA.html().length && $pntB.html().length){
      passNum++;
      $passNum.html(passNum);
    }
  });
  $prevPass.on('tapstart', function(){
    shrinkMap();
    if ($('span.toggle').hasClass('active')){
      app.moveLine(-1);
    } else{
      app.moveLine(1);
    }
    if ($pntA.html().length && $pntB.html().length){
      passNum--;
      $passNum.html(passNum);
    }
  });

  //slider
  var slider = new Slider(app);
  slider.init();


  //sheetsee
  var flightPaths = new FlightPaths(app);
  $flightBtn.on('tapstart', function(){
    var index = $(this).index($flightBtn);
    app.map.removeMarkers();
    flightPaths.addMarkers('flight' + (index+1));
    app.addCurrentMarker();
    $flightModal.removeClass('active');
  });
});
