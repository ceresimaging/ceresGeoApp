function App(){

  var app = this;

  function showLocation(el, position) {
    el.html( 'lat: '+position.coords.latitude +
                  ' long: '+position.coords.longitude +
                  ' accuracy: '+position.coords.accuracy);
  }
  function errorCallback(){
  }

  this.watchID = null;
  this.posCurrent = null;
  this.posA = null;
  this.posB = null;

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
