const basicAuth = require('express-basic-auth');

module.exports = basicAuth({
  users: {
    [process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD
  },
  challenge: true
});
