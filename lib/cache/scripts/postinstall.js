/**
 * @fileoverview Deletes the packages cache.  Re-runs the File.getPackages() 
 * command to rebuild the packages cache.
 */
const chalk = require('chalk');
const Cache = require(__dirname + '/../cache.class.js');
const Shutdown = require('ncli-core-helpers').Shutdown;
const Files = require('ncli-core-files');
const ProgressBar = require('progress');

let progress = null;
const init = (total, name) => {
    progress = new ProgressBar(':bar ' +
        chalk.grey('(:current/:total packages) ') + chalk.yellow(':label'), {
            label: name,
            total,
            width: 40
        });
};

Cache.clear('packages');
console.info('Building packages cache.');
let result = Files.getNodeModulePackages(Files.getMainDirectory(), false, 
    (current, total, name) => {
        if (!progress) {
            init(total, name);
        } else if (current == total) {
            setTimeout(() => {
                progress.tick({
                    label: chalk.green('done')
                });
            }, current * 10);
            setTimeout(() => {
                Shutdown.start();
            }, 10 * total);
        } else {
            setTimeout(() => {
                progress.tick({
                    label: name
                })
            }, current * 10);
        }
    });