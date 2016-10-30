var Strategy = require('passport-local').Strategy;
var crypto = require('crypto');
var models = require('../app/models');

var sha512 = function(password, salt) {
  var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var value = hash.digest('hex');
  return {
    salt: salt,
    passwordHash: value
  };
};

module.exports = function(passport) {
  passport.use(new Strategy(
    function(username, password, cb) {
      models.users.findByUsername(username, function(err, user) {
        if (err) {
          return cb(err);
        }
        if (!user) {
          return cb(null, false);
        }
        var shaDigest = sha512(password, user.passwordSalt);
        console.log("Salted: " + JSON.stringify(shaDigest));
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
    models.users.findById(id, function(err, user) {
      if (err) {
        return cb(err);
      }
      cb(null, user);
    });
  });
};
