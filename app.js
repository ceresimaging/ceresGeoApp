Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}

function App(){

  var app = this;

  function showLocation(el, position) {
    el.html( 'lat: '+position.coords.latitude +
                  ' long: '+position.coords.longitude +
                  ' accuracy: '+position.coords.accuracy);
  }
  function errorCallback(){
  }
  // adapted from Moveable Type
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

  this.watchID = null;
  this.posCurrent = null;
  this.posA = null;
  this.posB = null;
  this.distance = null;

  this.getLocationA = function(el) {
    navigator.geolocation.getCurrentPosition(function(position){
      showLocation(el, position);
      app.posA = position;
    });
  };

  this.getLocationB = function(el) {
    navigator.geolocation.getCurrentPosition(function(position){
      showLocation(el, position);
      app.posB = position;
    });
  };

  this.watchLocation = function(el) {
    app.watchID = navigator.geolocation.watchPosition(function(position){
      showLocation(el, position);
      app.posCurrent = position;
      console.log(getPntDist(app.posA, app.posB));
    }, errorCallback, { enableHighAccuracy: true });
  };

}

$(function(){

  var $position = $('#position');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');

  var app = new App();
  app.watchLocation($position);
  $btnA.click(function(e){
    e.preventDefault();
    app.getLocationA($pntA);
  });
  $btnB.click(function(e){
    e.preventDefault();
    app.getLocationB($pntB);
  });

})
