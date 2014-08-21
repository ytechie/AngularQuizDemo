/*jslint browser: true*/
/*global $, angular*/

(function() {
    'use strict';

    var quizApp = angular.module('quizApp', [
        'ngRoute',
        'quizControllers'
    ]);

    quizApp.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/quiz', {
                    templateUrl: '/partials/quiz-start.html',
                    controller: 'QuizStartController'
                }).
                when('/quiz/question', {
                    templateUrl: '/partials/quiz-question.html',
                    controller: 'QuizQuestionController',
                    reloadOnSearch: false
        }).
                when('/leaderboard', {
                    templateUrl: '/partials/quiz-leaderboard.html',
                    controller: 'QuizLeaderboardController'
                }).
                otherwise({
                    redirectTo: '/quiz'
                });
        }]);
})();