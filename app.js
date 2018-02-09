Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}
Number.prototype.toDegrees = function() {
  return this * 180 / Math.PI;
}

function App(){

  var app = this;

  function errorCallback(){
  }
  // algorithm from Moveable Type
  // www.movable-type.co.uk/scripts/latlong.html
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
  function getBearing(a, b){
    var lat1 = a.coords.latitude;
    var lat2 = b.coords.latitude;
    var lng1 = a.coords.longitude;
    var lng2 = b.coords.longitude;
    var y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    var brng = Math.atan2(y, x).toDegrees();
    return brng;
  }

  // algorithm from Moveable Type
  // www.movable-type.co.uk/scripts/latlong.html
  function getTrackDist(a, b, curr){
    var R = 6371;
    dist13 = getPntDist(a, curr);
    brng13 = getBearing(a, curr);
    brng12 = getBearing(a, b);
    var crossDist = Math.asin(Math.sin(dist13 / R ) * Math.sin(brng13 - brng12)) * R;
    return crossDist;
  }

  this.watchID = null;
  this.posCurrent = null;
  this.posA = null;
  this.posB = null;
  this.trackDist = null;

  this.getLocationA = function() {
    navigator.geolocation.getCurrentPosition(function(position){
      app.posA = position;
    });
  };

  this.getLocationB = function() {
    navigator.geolocation.getCurrentPosition(function(position){
      app.posB = position;
    });
  };

  this.watchLocation = function() {
    app.watchID = navigator.geolocation.watchPosition(function(position){
      app.posCurrent = position;
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
  };

}

$(function(){

  var $position = $('#position');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');
  var $trackDist = $('#track-dist');
  function parsePoint(point) {
    if (point){
      var str = 'lat: ' + point.coords.latitude +
                ' long: ' + point.coords.longitude +
                ' accuracy: ' + point.coords.accuracy;
      return str;
    }
  }

  var app = new App();
  app.watchLocation($position);
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
    $trackDist.html(trackDist);
  })
})