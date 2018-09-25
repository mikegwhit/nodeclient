/**
 * @fileoverview This file combats weird NPM and Yarn errors relating to local
 * filesystem lib.  What it does is delete the lock files, redownload the 
 * dependencies IN ORDER such that the lowest dependency is rebuilt first.  It 
 * seemed like once a low-level dependency had been corrupted other installs 
 * would fail.  This script solves for that.
 */
const cp = require('child_process');
const fs = require('fs');
const chalk = require('chalk');

const safeInstall = (dir) => {
    const cwd = process.cwd();
    process.chdir(dir);
    console.log(chalk.cyan('Safely Installing'), dir);
    try {fs.unlinkSync('./package-lock.json');} catch(e) {}
    try {
        cp.execSync('rm -rf node_modules', {encoding: 'utf8', stdio: 'ignore'});
    } catch(e) {
        console.log(chalk.red('Failure Occurred'), dir);
    }
    try {
        cp.execSync('npm i', {encoding: 'utf8', stdio: 'ignore'});
    } catch(e) {
        console.log(chalk.red('Failure Occurred'), dir);
    }
    process.chdir(cwd);
}
safeInstall(__dirname + '/../lib/rscandir');
safeInstall(__dirname + '/../lib/files');
safeInstall(__dirname + '/../lib/helpers');
safeInstall(__dirname + '/../lib/configs');
safeInstall(__dirname + '/../lib/cache');
safeInstall(__dirname + '/../lib/logger');
safeInstall(__dirname + '/../lib/console');
safeInstall(__dirname + '/../lib/scripts');
const packageJSON = 
    JSON.parse(require('fs').readFileSync(__dirname + '/package.json'));
packageJSON['dependencies'] = packageJSON['localDependencies'];
require('fs').writeFileSync(__dirname + '/package.json', 
    JSON.stringify(packageJSON, null, 2));
safeInstall(__dirname + '/../');
require('ncli-core-helpers').Shutdown.start();
