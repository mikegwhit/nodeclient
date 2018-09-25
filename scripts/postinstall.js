/**
 * Builds the cache for both the package index AND the files index for all 
 * packages.
 * @fileoverview
 */

const Files = require('ncli-core-files');
const Cache = require('ncli-core-cache');
const chalk = require('chalk');
const Shutdown = require('ncli-core-helpers').Shutdown;
console.log(chalk.yellow('Caching Configs'));
Files.readAllFiles('configs');
console.log(chalk.yellow('Caching Scripts'));
Files.readAllFiles('scripts');
console.log(chalk.yellow('Caching Timers'));
Files.readAllFiles('timers');
console.log(chalk.yellow('Caching Keys'));
Files.readAllFiles('keys');
Cache.options('localFiles', {
    persist: true
});
Cache.options('packages', {
    persist: true
});
Cache.options('packageObjects', {
    persist: true
});
console.log(chalk.green('Done'));
Shutdown.start();