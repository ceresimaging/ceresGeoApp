$(function(){

  var $position = $('#position');
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


  navigator.geolocation.watchPosition(geo_success, geo_error, geo_options);

})
