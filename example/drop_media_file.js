// https://github.com/mikolalysenko/drag-and-drop-files
"use strict"

var app = angular.module('MusicMetaDataExample', []);

app.directive('dragAndDrop', ['$http', function($http) {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      text: '@',
      onDropFiles: '='
    },
    require: '?ngModel',
    template: '<div class="alert alert-info" ng-transclude></div>',
    link: function(scope, element, attrs, ngModel) {

      function handleDrop (callback, event) {
        event.stopPropagation()
        event.preventDefault()
        callback(Array.prototype.slice.call(event.dataTransfer.files))
      }

      function killEvent (e) {
        e.stopPropagation()
        e.preventDefault()
        return false
      }

      function addDragDropListener (element, callback) {
        element.addEventListener("dragenter", killEvent, false)
        element.addEventListener("dragover", killEvent, false)
        element.addEventListener("drop", handleDrop.bind(undefined, callback), false)
      }

      addDragDropListener(element[0], function (files) {
        scope.onDropFiles(files);
        scope.$apply() //this triggers a $digest
      });
    }
  };
}])

app.controller('DropAudioController', function($scope, $log) {
  $log.debug('init controller...')

  var self = this;

  self.showMetaData = function(file){
    $log.debug('Retrieving metadata of file "%s"....', file.name)
    $scope.file = file

    self.getImageData = function(picture) {
      $log.debug('getImageData: %o', picture)
      return URL.createObjectURL(new Blob([picture.data], {'type': 'image/' + picture.format }));
    }

    musicMetadata(file, {native: true}, function (err, metadata) {
      if (err) {
        $log.error('Error: %s', err)
        throw err;
      }
      $log.debug('Got metadata %o', metadata)
      // Post processing metadata
      $scope.metadata = metadata
      if($scope.metadata.common.picture) {
        for(var i in $scope.metadata.common.picture) {
          $scope.metadata.common.picture[i].url = self.getImageData($scope.metadata.common.picture[i])
        }
      }
      $scope.native = $scope.metadata[$scope.metadata.format.tagType]

      $scope.$apply()
    });
  }

  $scope.handleDropFiles = function(files) {
    $log.debug('handleDropFiles: %o', files)
    self.showMetaData(files[0]);
  }

  $scope.isArray = angular.isArray
})

app.filter('secondsToTime', function() {

  function padTime(t) {
    return t < 10 ? "0"+t : t;
  }

  return function(_seconds) {
    if (typeof _seconds !== "number" || _seconds < 0)
      return "00:00:00";

    var hours = Math.floor(_seconds / 3600),
      minutes = Math.floor((_seconds % 3600) / 60),
      seconds = Math.floor(_seconds % 60)

    return padTime(hours) + ":" + padTime(minutes) + ":" + padTime(seconds);
  };
})