$(function(){

  var $position = $('#position');
  var $pntA = $('#pnt-A');
  var $pntB = $('#pnt-B');
  var $btnA = $('#btn-A');
  var $btnB = $('#btn-B');
  var wpid = null;

  var geo_options = {
    enableHighAccuracy: true,
  };

  function geo_success( position ) {
    $position.html( 'lat: '+position.coords.latitude +
                    ' long: '+position.coords.longitude +
                    ' accuracy: '+position.coords.accuracy);

  }

  function geo_error() {
    $position.html('error');
  }

  $btnA.click(function(e) {
    e.preventDefault();
    navigator.geolocation.getCurrentPosition(function(position) {
      $pntA.html( 'lat: '+position.coords.latitude +
                    ' long: '+position.coords.longitude +
                    ' accuracy: '+position.coords.accuracy);
    });
  });

  $btnB.click(function(e) {
    e.preventDefault();
    navigator.geolocation.getCurrentPosition(function(position) {
      $pntB.html( 'lat: '+position.coords.latitude +
                    ' long: '+position.coords.longitude +
                    ' accuracy: '+position.coords.accuracy);
    });
  });

  navigator.geolocation.watchPosition(geo_success, geo_error, geo_options);

})
