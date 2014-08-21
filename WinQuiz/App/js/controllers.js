/*jslint browser: true*/
/*global $, angular, WindowsAzure*/

(function() {
    'use strict';

    var quizControllers = angular.module('quizControllers', []);
 
    quizControllers.controller('QuizStartController', ['$scope', '$routeParams', '$location', 'Quiz',
        function ($scope, $routeParams, $location, Quiz) {
            var user = {                
                firstName: $routeParams.VISITOR_NAME,
                email: $routeParams.VISITOR_EMAIL
            };
            
            $scope.user = user;

            $scope.begin = function (quizNumber) {
                Quiz.startQuiz(user, quizNumber);
                Quiz.save();
                $location.url("/quiz/question?questionId=0");
            };
        }
    ]);

    quizControllers.controller('QuizQuestionController', ['$scope', '$routeParams', '$route', '$location', '$window', 'Quiz',
        function($scope, $routeParams, $route, $location, $window, Quiz) {
            console.log('Quiz Question Controller Loaded');
            $scope.questionId = parseInt($routeParams.questionId, 0);
            
            function updateElapsedTime() {
                $scope.elapsed = Quiz.getElapsedTime() / 1000;
                $scope.$apply();
            }

            //Start our timer to update the UI
            setInterval(updateElapsedTime, 100);
            
            $scope.$on('$routeUpdate', function (e) {
                $scope.questionId = parseInt($routeParams.questionId, 0);
                loadQuestion($scope, Quiz);
            });

            $scope.prev = function () {
                $window.history.back();
            };
            
            $scope.next = function () {
                var newQuestionId = $scope.questionId + 1;

                $scope.questionId = newQuestionId;
                $location.search('questionId', newQuestionId);
                
                loadQuestion($scope, Quiz);
            };

            Quiz.getQuiz().then(function (questions) {
                loadQuestion($scope, Quiz);
            });
        }]);
    
        function loadQuestion($scope, Quiz) {
            var i, questions;

            questions = Quiz.state.questions;

            console.log(questions.length + ' Questions Loaded');

            $scope.question = questions[$scope.questionId];
            $scope.lastQuestionId = Quiz.getQuestionCount() - 1;
            $scope.percentComplete = Quiz.getPercentComplete($scope.questionId);
            $scope.isFirstQuestion = $scope.questionId <= 0;
            $scope.isLastQuestion = $scope.questionId >= $scope.lastQuestionId;

            $scope.answered = _.find($scope.question.Answers, function (answer) {
                return answer.Chosen;
            });

            $scope.userSelectAnswer = function (answer) {
                $scope.answered = true;
                $scope.question.Answers.forEach(function (a) {
                    a.Chosen = a === answer;
                });
                Quiz.save();
            };
        }
    
    quizControllers.controller('QuizLeaderboardController', ['$scope', 'Quiz',
    function ($scope, Quiz) {
        var score, scoreRecord;

        Quiz.getQuiz().then(function () {
            var client;
            
            try {
                client = new WindowsAzure.MobileServiceClient(
                    "[URL REMOVED]",
                    "[KEY REMOVED]"
                );
            } catch (e) {
                $scope.error = e;
                return;
            }
            var scoresTable = client.getTable("Scores");

            var loadLeaderboard = function() {
                $scope.leaders = [];

                scoresTable.where({ quizNumber: 1 })
                    .where(function () {
                        return this.email.indexOf("@example.com") === -1;
                    })
                    .orderByDescending('percentCorrect').orderBy('timeTaken').take(10).read().done(function (results) {
                    $scope.leaders[1] = results;
                    $scope.$apply();
                }, function (e2) {
                    $scope.error = e2;
                });

                scoresTable.where({ quizNumber: 2 })
                    .where(function () {
                        return this.email.indexOf("@example.com") === -1;
                    })
                    .orderByDescending('percentCorrect').orderBy('timeTaken').take(10).read().done(function (results) {
                    $scope.leaders[2] = results;
                    $scope.$apply();
                }, function (e4) {
                    $scope.error = e4;
                });
            };
            
            score = Quiz.getQuizScore();

            if (score) {
                $scope.numCorrect = score.numCorrect;
                $scope.percentCorrect = score.percentCorrect;
                $scope.timeTaken = score.timeTaken;
            }

            if (Quiz.state.finished || !score) {
                loadLeaderboard();
            } else {
                //Insert our score before loading the leaderboard...

                Quiz.state.finished = true;
                Quiz.save();

                scoreRecord = {
                    email: Quiz.state.user.email,
                    firstName: Quiz.state.user.firstName,
                    lastName: Quiz.state.user.lastName,
                    companyName: Quiz.state.user.companyName,
                    jobTitle: Quiz.state.user.jobTitle,
                    numCorrect: $scope.numCorrect,
                    percentCorrect: $scope.percentCorrect,
                    timeTaken: $scope.timeTaken,
                    quizNumber: Quiz.state.quizNumber
                };
                
                scoresTable.insert(scoreRecord).done(function () {
                    loadLeaderboard();
                }, function (e3) {
                    $scope.error = e3;
                    loadLeaderboard();
                });
            }
        });
    }]);

    quizControllers.factory('Quiz', ['$q', function ($q) {
        var LOCAL_STORAGE_KEY = 'quiz',
        defaultQuestions = [
            {
                "Question": "How many licks to the center of a tootsie pop?",
                "Answers": [
                    {
                        "Text": "One Lick",
                        "Correct": false
                    },
                    {
                        "Text": "Two Licks",
                        "Correct": false
                    },
                    {
                        "Text": "Three Licks",
                        "Correct": true
                    }
                ]
            },
            {
                "Question": "How long should I stay at the zoo before the monkeys turn into people?",
                "Answers": [
                    {
                        "Text": "One Day",
                        "Correct": true
                    },
                    {
                        "Text": "Two Years",
                        "Correct": false
                    },
                    {
                        "Text": "Three Decades",
                        "Correct": false
                    }
                ]
            },
            {
                "Question": "The light bulb was invented in 1877. Prior to that time, how did people get ideas?",
                "Answers": [
                    {
                        "Text": "Lantern",
                        "Correct": true
                    },
                    {
                        "Text": "Burning Stick",
                        "Correct": false
                    },
                    {
                        "Text": "Sun",
                        "Correct": false
                    }
                ]
            },
            {
                "Question": "If Hydrogen is so dangerous, why do they mix it with water?",
                "Answers": [
                    {
                        "Text": "H2 Who?",
                        "Correct": true
                    },
                    {
                        "Text": "Water you mean?",
                        "Correct": false
                    }
                ]
            }
        ];

        return {
            state: null,
            getQuiz: function(quizNumber) {
                var deferred = $q.defer();
                
                if (!this.state) {
                    this.state = angular.fromJson(window.localStorage[LOCAL_STORAGE_KEY]);
                    
                    //Dates don't parse correctly, we have to do it manually
                    if (this.state && this.state.startTime) {
                        this.state.startTime = new Date(this.state.startTime);
                    }

                    if (!this.state) {
                        this.state = {};
                    }
                }
                
                //Check the question cache
                if (this.state.questions) {
                    //cache hit
                } else {
                    if(this.state.quizNumber === 1) {
                        this.state.questions = _.sample(defaultQuestions, 10);
                        console.log('loaded quiz #1');
                    } else {
                        this.state.questions = _.sample(defaultQuestions, 10);
                        console.log('loaded quiz #2');
                    }
                }

                deferred.resolve(this.state.questions);

                return deferred.promise;
            },
            save: function () {
                try {
                    window.localStorage[LOCAL_STORAGE_KEY] = angular.toJson(this.state);
                } catch (e) {
                    console.log('Local storage throw an error. Leaving the quiz will lose state');
                    //alert('Unable to save quiz state. Ensure that private browsing mode is disabled.');
                }                
            },
            startQuiz: function (user, quizNumber) {
                window.localStorage.removeItem([LOCAL_STORAGE_KEY]);
                
                this.state = {
                    user: user,
                    quizNumber: quizNumber
                };
                this.state.startTime = new Date();
            },
            getElapsedTime: function () {
                if (!this.state.startTime) {
                    this.state.startTime = new Date();
                }
                    
                return ((new Date()) - this.state.startTime);
            },
            getQuestionCount: function() {
                return this.state.questions.length;
            },
            getPercentComplete: function(currentQuestionNum) {
                return Math.round((currentQuestionNum / this.getQuestionCount()) * 100);
            },
            getQuizScore: function() {
                var i, q, numCorrect = 0, percentCorrect;

                if (!this.state || !this.state.startTime) {
                    return null;
                }

                for (i = 0; i < this.state.questions.length; i += 1) {
                    q = this.state.questions[i];

                    q.Answers.forEach(function(answer) {
                        if (answer.Correct && answer.Chosen) {
                            numCorrect += 1;
                        }
                    });
                }

                percentCorrect = (numCorrect / this.state.questions.length) * 100;

                return {
                    numCorrect: numCorrect,
                    percentCorrect: percentCorrect,
                    timeTaken: this.getElapsedTime() / 1000
            };
            }
        };
    }]);

})();