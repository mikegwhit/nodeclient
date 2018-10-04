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
cp.execSync('chmod 777 -R .');

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
    console.log(chalk.green('Safely Installed'), dir);
    process.chdir(cwd);
}
safeInstall(__dirname + '/../lib/core/rscandir');
safeInstall(__dirname + '/../lib/core/files');
safeInstall(__dirname + '/../lib/core/helpers');
safeInstall(__dirname + '/../lib/core/configs');
safeInstall(__dirname + '/../lib/core/cache');
safeInstall(__dirname + '/../lib/core/logger');
safeInstall(__dirname + '/../lib/core/console');
safeInstall(__dirname + '/../lib/core/scripts');
const packageJSON = 
    JSON.parse(require('fs').readFileSync(__dirname + '/../package.json'));
packageJSON['dependencies'] = packageJSON['localDependencies'];
packageJSON['scripts'] = {
    'postinstall': 'node scripts/postinstall.js'
};
require('fs').writeFileSync(__dirname + '/../package.json', 
    JSON.stringify(packageJSON, null, 2));
safeInstall(__dirname + '/../');
process.exit();