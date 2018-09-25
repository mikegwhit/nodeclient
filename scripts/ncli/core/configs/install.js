require(__dirname + '/../../index.js');
(() => {
/**
 * @file
 * This file should create a "configs" folder in the calling directory.
 */
let fs = require('fs');
let path = require('ncli-core-files').getApplicationDirectory();
if (!fs.existsSync(path + '/configs')) {
    fs.mkdirSync(path + '/configs');
}
process.exit();
})();