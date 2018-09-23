'use strict';
require.resolve(__dirname + '/rscandir.class.js'); // TODO: Figure out why this clears bugs.
module.exports = require(__dirname + '/rscandir.class.js').walkSync;