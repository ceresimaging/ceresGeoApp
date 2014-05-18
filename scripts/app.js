Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}
Number.prototype.toDegrees = function() {
  return this * 180 / Math.PI;
}

function App(){

  var app = this;
  // gmaps
  var map = new GMaps({div: '#map',
                       lat: -12,
                       lng: -77,
                       mapType: 'SATELLITE'});
  var currentMarkerIcon = {
    url: 'images/currentMarker.png',
    origin: new google.maps.Point(0,0),
    anchor: new google.maps.Point(32,32)
  };
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
    var a = Math.sin(dLat / 2) * Math.sin(dLat /2) +
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
    dist13 = getPntDist(a, curr);
    brng13 = getBearing(a, curr);
    brng12 = getBearing(a, b);
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
    var brng = getBearing(a, b);
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
    delete app.posA.coords.latitude;
    delete app.posA.coords.longitude;
    delete app.posB.coords.latitude;
    delete app.posB.coords.longitude;
    app.posA = { coords: { latitude: latA, longitude: lngA } };
    app.posB = { coords: { latitude: latB, longitude: lngB } };
  }


  this.watchID = null;
  this.posCurrent = null;
  this.posA = null;
  this.posB = null;
  this.trackDist = null;
  this.moveDist = 850/1000;

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
        drawLine()
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

          if (app.posA && app.posB){
            app.trackDist = getTrackDist(app.posA, app.posB, app.posCurrent);
          }
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
      app.moveDist = $(this).val()/1000;
    })
    $menu.on('click', '#shift-distance', function(){
      $sliderContain.slideToggle();
      $(this).toggleClass('icon-active');
    });
  };
}

$(function(){

  // location data
  var $position = $('#position');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');
  var $nextPass = $('#next-pass');
  var $prevPass = $('#prev-pass');
  var $trackDist = $('#track-dist');
  function parsePoint(point) {
    if (point){
      var str = 'lat: ' + point.coords.latitude.toFixed(5) +
                ' long: ' + point.coords.longitude.toFixed(5);
      return str;
    }
  }

  var app = new App();
  app.watchLocation();
  $btnA.click(function(e){
    e.preventDefault();
    app.getLocationA();
  });
  $btnB.click(function(e){
    e.preventDefault();
    app.getLocationB();
  });
  $(app).on('move', function(e, posCurrent, posA, posB, trackDist) {
    $position.html(parsePoint(posCurrent));
    $pntA.html(parsePoint(posA));
    $pntB.html(parsePoint(posB));
    $trackDist.html( (trackDist * 1000).toFixed(2) + 'm L');
  });

  // move line buttons
  $nextPass.on('click', function(){
    if ($('span.toggle').hasClass('active')){
      app.moveLine(1);
    } else{
      app.moveLine(-1);
    }
  });
  $prevPass.on('click', function(){
    if ($('span.toggle').hasClass('active')){
      app.moveLine(-1);
    } else{
      app.moveLine(1);
    }
  });

  //slider
  var slider = new Slider(app);
  slider.init();


})
