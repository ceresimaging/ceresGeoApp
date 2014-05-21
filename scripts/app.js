Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};
Number.prototype.toDegrees = function() {
  return this * 180 / Math.PI;
};
Number.prototype.toFeet = function() {
  return this * 3.28084;
}
Number.prototype.toMeters = function() {
  return this * 0.3048;
}

function App(){

  var app = this;
  // gmaps
  var map = new GMaps({div: '#map',
                       lat: -12,
                       lng: -77,
                       mapType: 'SATELLITE'});
  var currentMarkerIcon =  {path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                 scale: 4,
                 anchor: new google.maps.Point(0, 3),
                 strokeColor: '#55efcb',
                 rotation: '0'};
  var currentMarker = map.createMarker({ lat: -12, lng: -77, icon: currentMarkerIcon});

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
    map.removePolylines();
    map.drawPolyline({
      path: path,
      strokeColor: '#ff2d55',
      strikeOpacity: 1,
      strokeWeight: 6
    });
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


  this.watchID = null;
  this.posCurrent = null;
  this.posA = null;
  this.posB = null;
  this.trackDist = null;
  this.moveDist = ((850).toMeters())/1000;

  this.moveLine = function(dir) {
    if (app.posA && app.posB){
      movePoints(app.moveDist, dir);
      drawLine();
    }
  };

  this.getLocationA = function() {
    navigator.geolocation.getCurrentPosition(function(position){
      app.posA = position;
      if (app.posB) {
        drawLine();
      }
    }, errorCallback, { enableHighAccuracy: true });
  };

  this.getLocationB = function() {
    navigator.geolocation.getCurrentPosition(function(position){
      app.posB = position;
      if (app.posA) {
        drawLine();
      }
    }, errorCallback, { enableHighAccuracy: true });
  };

  this.watchCompass = function() {
    var trackDist;
    var bearing;
    var angleDiff;
    Compass.watch(function(heading){
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
    window.setInterval(getPosition, 1000);
      function getPosition(){
        navigator.geolocation.getCurrentPosition(function(position){
          var lat = position.coords.latitude;
          var long = position.coords.longitude;
          app.posCurrent = position;

          // set map center
          map.setCenter(lat, long);

          // update current marker position
          currentMarker.setPosition({lat: lat, lng: long});

          $(app).trigger('move',
                        [app.posCurrent,
                         app.posA,
                         app.posB,
                         app.trackDist]
                        );
        }, errorCallback, { enableHighAccuracy: true });
      }
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
    $menu.on('click', '#shift-distance', function(){
      $sliderContain.slideToggle();
      $(this).toggleClass('icon-active');
    });
  };
}

$(function(){

  // location data
  var $position = $('#position');
  var $passNum = $('#pass-number');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');
  var $arrow = $('#arrow-icon');
  var $nextPass = $('#next-pass');
  var $prevPass = $('#prev-pass');
  var $trackDist = $('#track-dist');
  var passNum = 1;
  function parsePoint(point) {
    if (point){
      var str = 'lat: ' + point.coords.latitude.toFixed(5) +
                ' long: ' + point.coords.longitude.toFixed(5);
      return str;
    }
  }

  var app = new App();
  app.watchLocation();
  app.watchCompass();
  $btnA.click(function(e){
    e.preventDefault();
    app.getLocationA();
    passNum = 1;
    $passNum.html(passNum);
  });
  $btnB.click(function(e){
    e.preventDefault();
    app.getLocationB();
    passNum = 1;
    $passNum.html(passNum);
  });
  $(app).on('move', function(e, posCurrent, posA, posB, trackDist) {
    var distStr = Math.abs(trackDist * 1000).toFeet().toFixed(2); + 'ft';
    $position.html(parsePoint(posCurrent));
    $pntA.html(parsePoint(posA));
    $pntB.html(parsePoint(posB));
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
  $nextPass.on('click', function(){
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
  $prevPass.on('click', function(){
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


});
