var config = require('./config');
var express = require('express');
var app = express();
var logger = require('morgan');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var passport = require('passport');
var models = require('./app/models');
var env = (function(){
      var Habitat = require("habitat");
      Habitat.load();
      return new Habitat();
    }())

require('./config/passport')(passport); // pass passport for configuration

var debug = function() {
  if (config.debug) {
    console.log.apply(console, arguments);
  }
};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
  extended: true
}));
app.use(require('express-session')({
  secret: env.get("SESSION_SECRET"),
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

io.on('connection', function(socket) {
  debug('[io]', 'client connected:', socket.id);

  socket.on('listSubmissions', function(submissionFilter) {
    models.submissions.listSubmissions(submissionFilter, function(retrievedSubmissions) {
      socket.emit('submissionList', retrievedSubmissions);
    });
  });

  socket.on('getSubmission', function(submissionID) {
    models.submissions.getSubmission(submissionID, function(htmlOutput) {
      socket.emit('submissionEntry', htmlOutput);
    })
  });

  socket.on('disconnect', function() {
    debug('[io]', 'client disconnected:', socket.id);
  });
});

// log all the things
app.use(logger('dev'));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// routes ======================================================================
require('./app/routes.js')(app, passport);

// start the apps
server.listen(config.port, function() {
  console.log('Server running at http://127.0.0.1:' + config.port);
});
