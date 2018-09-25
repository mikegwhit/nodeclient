/**
 * @fileoverview Takes input module/script to run, where script is resolved as
 * a file in the scripts folder.
 */

const Scripts = require(__dirname + '/../scripts.class.js');
let Shutdown = null;
try {
    require('minimist');
    Shutdown = require('ncli-core-heplers').Shutdown;
} catch(e) {
   process.exit();
}
process.chdir(__dirname + '/../');

(new Scripts()).initialExecution.then(() => {
    Shutdown.start();
}).catch((e) => {
    Shutdown.start();
});