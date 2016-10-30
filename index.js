var config = require('./config');
var express = require('express');
var app = express();
var logger = require('morgan');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var AWS = require('aws-sdk');
var path = require('path');
var mustache = require('mustache');
var fs = require('fs');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var db = require('./db');
var crypto = require('crypto');

var debug = function() {
  if (config.debug) {
    console.log.apply(console, arguments);
  }
};

var sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());


// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        return cb(null, false);
      }
      var shaDigest = sha512(password, user.passwordSalt);
      console.log("Salted: "+JSON.stringify(shaDigest));
      if (user.password != shaDigest.passwordHash) {
        return cb(null, false);
      }
      return cb(null, user);
    });
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function(err, user) {
    if (err) {
      return cb(err);
    }
    cb(null, user);
  });
});




// Loading in the secret stuff
AWS.config.loadFromPath('./aws-config.json');


io.on('connection', function(socket) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  debug('[io]', 'client connected:', socket.id);

  socket.on('listSubmissions', function(submissionFilter) {
    console.log("Querying...");

    var listScope = {
      "eoi-project": "submissionID, submissionType, #ts, artistName, project_title, focus_areas",
      "eoi-fixed-media": "submissionID, submissionType, #ts",
      "eoi-collab": "submissionID, submissionType, #ts, artistName",
      "eoi-academy": "submissionID, submissionType, #ts"
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
        socket.emit('submissionEntry', htmlOutput);
      }
    });
  });

  socket.on('disconnect', function() {
    debug('[io]', 'client disconnected:', socket.id);
  });
});

// log all the things
app.use(logger('dev'));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// // send index.html
// app.get('/', function(req, res) {
//   res.sendfile(__dirname + '/index.html');
// });

app.get('/',
  function(req, res) {
    res.render('index', { user: req.user });
    console.log("USER INFO:"+ JSON.stringify(req.user));
  });

app.get('/login',
  function(req, res) {
    res.render('login');
  });

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout',
  function(req, res) {
    req.logout();
    res.redirect('/');
  });

// start the apps
server.listen(config.port, function() {
  console.log('Server running at http://127.0.0.1:' + config.port);
});
