var app = angular.module('j5netControllers');

app.controller('carCtrl', ['$scope', 'webSocket', '$http','NgMap', function($scope, webSocket, $http, NgMap) {
      var mymap = this;

      $scope.config = {};
      $scope.googleMapsUrl = "";

      // loading config (nodes to show in dashboard,..)
      $http({method: 'GET', url: 'config.json'}).then(
            function successCallback(response) {
                  $scope.config = response.data;
                  $scope.googleMapsUrl ="https://maps.googleapis.com/maps/api/js?key="+$scope.config.googleMapsAPIkey;
            },
            function errorCallback(response) {
                  console.log("error while loading local config !");
            }
      );

      $scope.lat = NaN;
      $scope.lng = NaN;
      $scope.lastCarUpdate = NaN;
      $scope.distanceFromWork = NaN;
      $scope.distanceFromHome = NaN;

      $scope.$on('socket:car-position', function (ev, data) {
            if (data.lat)                 $scope.lat = data.lat;
            if (data.lng)                 $scope.lng = data.lng;
            if (data.lastUpdate)          $scope.lastCarUpdate = (Date.now()-data.lastUpdate)/1000;
            if (data.distanceFromWork)    $scope.distanceFromWork = data.distanceFromWork;
            if (data.distanceFromHome)    $scope.distanceFromHome = data.distanceFromHome;
      });
      if ($scope.connected==true)
            webSocket.emit('car-position');
}]);