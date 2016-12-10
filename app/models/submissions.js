var mustache = require('mustache');
var fs = require('fs');

var AWS = require('aws-sdk');

// Loading in the secret stuff
AWS.config.loadFromPath(__dirname+'/aws-config.json');

var docClient = new AWS.DynamoDB.DocumentClient();

exports.listSubmissions = function(submissionFilter, cb) {
  console.log("Querying...");
  var listScope = {
    "eoi-project": "submissionID, submissionType, #ts, artistName, project_title, focus_areas",
    "eoi-fixed-media": "submissionID, submissionType, #ts",
    "eoi-collab": "submissionID, submissionType, #ts, artistName",
    "eoi-academy": "submissionID, submissionType, artistName, #ts"
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

      cb(retrievedSubmissions);

      // continue scanning if we have more submissions
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
};

exports.getSubmission = function(submissionID, cb) {
  var params = {
    TableName: "tilde-submissions",
    Key: {
      "submissionID": submissionID
    }
  };

  docClient.get(params, function(err, data) {
    var htmlTemplates = {
      "eoi-project": "project-submission.html.mustache",
      "eoi-collab": "collab-submission.html.mustache",
      "eoi-fixed-media": "fixed-media-submission.html.mustache",
      "eoi-academy": "academy-submission.html.mustache"
    }
    if (err) {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
      d = new Date(data.Item.timestamp);
      data.Item.timestamp = d.toDateString();
      if (data.Item.cv.fname) {
        var cvFileExt = data.Item.cv.fname.split('.').pop();
        data.Item.cv_filename = data.Item.submissionID + '-cv.' + cvFileExt;
      }
      var htmlTemplate = fs.readFileSync('./mustache/' + htmlTemplates[data.Item.submissionType], 'utf8');
      var htmlOutput = mustache.render(htmlTemplate, data.Item);
      cb(htmlOutput);
    }
  });
}
