var AWS = require('aws-sdk');

// Loading in the secret stuff
AWS.config.loadFromPath(__dirname+'/aws-config.json');

exports.submitEvaluation = function (userID, submissionID, evaluation, cb) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "tilde-evaluations",
    Item: {
      userID: userID,
      submissionID: submissionID,
      evaluation: evaluation
    }
  };

  params.Item.submissionID = identifier;

  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
    if (err) {
      console.log("Unable to add item. Error JSON: "+JSON.stringify(err, null, 2))
      return cb(err, null)
    } else {
      return cb(null, data);
    }
  });
};
