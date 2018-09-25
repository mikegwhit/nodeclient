require(__dirname + '/../../index.js');
(() => {
/**
 * @fileoverview Should add the necessary script boilerplate to 
 * node_modules/.bin folder.  This fixes the bug listed in 
 * https://github.com/npm/npm/issues/19821
 */
const chalk = require('chalk');
const binSrc = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case ` + '`uname`' + ` in
    *CYGWIN*) basedir=` + '`cygpath -w "$basedir"`' + `;;
esac

if [ -x "$basedir/node" ]; then
  "$basedir/node"  "$basedir/node_modules/ncli-core-scripts/ncli/core/scripts.js" "$@"
  ret=$?
else 
  node  "$basedir/node_modules/ncli-core-scripts/ncli/core/scripts.js" "$@"
  ret=$?
fi
exit $ret
`;

const binWinSrc = `
@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "%~dp0\\node_modules\\ncli-core-scripts\\ncli/core/scripts.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\\node_modules\\ncli-core-scripts\\ncli/core/scripts.js" %*
)
`;

const files = require('ncli-core-files');
const globalFolder = files.normalize(new Buffer(require('child_process')
  .execSync('npm config get prefix')).toString('utf8').replace('\n', ''));

if (!require('fs').existsSync(globalFolder + '/node_modules/ncli-core-scripts')) {
    console.log('Performing global install!');
    // DNE in global, we need to execute global install.
    require('child_process').execSync('npm install -g "' + 
        files.normalize(__dirname + '/../../') + '"');
}
const filename = files.getMainDirectory() + '/node_modules/.bin/ncli';
const winFilename = files.getMainDirectory() + '/node_modules/.bin/ncli.cmd';
const globalFilename = globalFolder + '/ncli';
const globalWinFilename = globalFolder + '/ncli.cmd';

files.writeFile(filename, binSrc);
require('fs').chmodSync(filename, 715);
files.writeFile(winFilename, binWinSrc);
require('fs').chmodSync(winFilename, 715);

files.writeFile(globalFilename, binSrc);
require('fs').chmodSync(filename, 715);
files.writeFile(globalWinFilename, binWinSrc);
require('fs').chmodSync(winFilename, 715);

const Shutdown = require('ncli-core-helpers').Shutdown;
})();