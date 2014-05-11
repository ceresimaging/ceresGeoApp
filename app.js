function App(){

  var app = this;

  function showLocation(el) {
    return function(position) {
      el.html( 'lat: '+position.coords.latitude +
                    ' long: '+position.coords.longitude +
                    ' accuracy: '+position.coords.accuracy);
    }
  }
  function errorCallback(){
  }

  this.watchID = null;

  this.getLocation = function(el) {
    navigator.geolocation.getCurrentPosition(showLocation(el));
  };

  this.watchLocation = function(el) {
    app.watchID = navigator.geolocation.watchPosition(showLocation(el),
        errorCallback, { enableHighAccuracy: true });
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
    app.getLocation($pntA);
  });
  $btnB.click(function(e){
    e.preventDefault();
    app.getLocation($pntB);
  });

})
