var AWS = require('aws-sdk');

// Loading in the secret stuff
AWS.config.loadFromPath(__dirname+'/aws-config.json');

exports.findById = function(uid, cb) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  var docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: "tilde-users",
    Key: {
      "id": uid
    }
  };
  docClient.get(params, function(err, data) {
    if (err) {
      return cb(err, null)
    } else {
      return cb(null, data.Item)
    }
  });
}

exports.findByUsername = function(username, cb) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "tilde-users",
    FilterExpression: "#un = :usrName",
    ExpressionAttributeNames: {
      "#un": "username"
    },
    ExpressionAttributeValues: {
      ":usrName": username
    }
  };

  var records = [];

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(submission) {
        records.push(submission);
      });

      // continue scanning if we have more submissions
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
    if (err) {
      return cb(null, null);
    } else {
      return cb(null, records[0]);
    }
  }
}
