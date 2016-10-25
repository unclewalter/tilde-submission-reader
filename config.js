var env = process.env;

module.exports =  {
  // TCP port for the clients to connect to.
  port: env['PORT'] || 3000,

  // enable verbose logging
  debug: true
};
