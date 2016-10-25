var config = require('./config');
var express = require('express');
var app = module.exports = express();
var logger = require('morgan');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var AWS = require('aws-sdk');
var path = require('path');

var debug = function() {
  if (config.debug) {
    console.log.apply(console, arguments);
  }
};

// Loading in the secret stuff
AWS.config.loadFromPath('./aws-config.json');


io.on('connection', function(socket) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  debug('[io]', 'client connected:', socket.id);

  socket.on('listSubmissions', function(submissionFilter) {
    console.log("Querying...");

    var listScope = {
      "eoi-project": "submissionID, #ts, artistName, project_title, focus_areas",
      "eoi-fixed-media": "",
      "eoi-collab": ""
    }

    var params = {
      TableName: "tilde-submissions",
      FilterExpression: "#st = :subType",
      ProjectionExpression: listScope[submissionFilter.submissionType],
      ExpressionAttributeNames: {
        "#st": "submissionType",
        "#ts": "timestamp"
      },
      ExpressionAttributeValues: {
        ":subType": submissionFilter.submissionType
      }
    };

    docClient.scan(params, onScan);

    function onScan(err, data) {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        // print all the movies
        console.log("Scan succeeded.");
        var retrievedSubmissions = [];
        data.Items.forEach(function(submission) {
          // console.log(JSON.stringify(submission, null, 2));
          retrievedSubmissions.push(submission);
        });

        socket.emit('submissionList', retrievedSubmissions);

        // continue scanning if we have more submissions
        if (typeof data.LastEvaluatedKey != "undefined") {
          console.log("Scanning for more...");
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          docClient.scan(params, onScan);
        }
      }
    }
  });
  socket.on('getSubmission', function(submissionID) {
    //
  });

  socket.on('disconnect', function() {
    debug('[io]', 'client disconnected:', socket.id);
  });
});

// log all the things
app.use(logger('dev'));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// send index.html
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// start the apps
server.listen(config.port, function() {
  console.log('Server running at http://127.0.0.1:' + config.port);
});
