const chalk = require('chalk');
const ProgressBar = require('progress');
const readline = require('readline');

/**
 * Handles shutdown events within the system.  This ensures the system has the
 * necessary time to perform cleanups before exiting.
 * @class
 */
class Shutdown {
    constructor() {
    }

    /**
     * Clears all the steps needed to shutdown.
     */
    static clear() {
        Shutdown.promises = [];
    }

    /**
     * Hooks the shutdown event.
     */
    static hook() {
        if (process.platform === 'win32') {
            readline.createInterface ({
                input: process.stdin,
                output: process.stdout
            }).on ('SIGINT', () => {
                process.emit('SIGINT');
            });
        }
        // listen for TERM signal .e.g. kill
        process.on('SIGTERM', (function() {
            Shutdown.start();
        }).bind(Shutdown));

        // listen for INT signal e.g. Ctrl-C
        process.on('SIGINT', (function() {
            Shutdown.start();
        }).bind(Shutdown));
        process.on('exit', (function() {
            Shutdown.start();
        }).bind(Shutdown));
    }

    /** 
     * Requires the promise to be fulfilled before shutdown.  It is not 
     * recommended to reject a promise since this will prevent other shutdown
     * sequences from occurring.
     * @param {Function} fn A function that is run when shutdown is started.
     * Function may return a promise if asynchronous operations are needed.
     * Promise should resolve when the shutdown function has completed.
     * 
     * If error occurs, return {err: 'Message'} format or reject the returned
     * promise.
     */
    static require(fn, label = ' ') {
        let idx = -1;
        const promise = (() => {
            return new Promise((resolve, reject) => {
                const ret = fn();
                if (ret && ret.then) {
                    ret.then((val) => {
                        let label = '';
                        if (Shutdown.promises[idx]) {
                            label = Shutdown.promises[idx].label;
                        }
                        if (idx == Shutdown.promises.length - 1) {
                            label = chalk.green('done');
                        }
                        Shutdown.bar.tick({
                            label
                        });
                        resolve(val);
                    }).catch((err) => resolve({err}));
                } else {
                    let label = '';
                    if (Shutdown.promises[idx]) {
                        label = Shutdown.promises[idx].label;
                    }
                    if (idx == Shutdown.promises.length - 1) {
                        label = chalk.green('done');
                    }
                    Shutdown.bar.tick({
                        label
                    });
                    resolve(ret);
                }
            });
        });
        idx = Shutdown.promises.push({
            promise,
            label
        });
    }

    /**
     * Starts the shutdown promise, waiting for all required promises to be
     * resolved or rejected.
     * @param {Boolean} debug If true, does not actually exit the process.
     */
    static start(debug = false) {
        if (Shutdown.started) {
            return new Promise((res, rej) => {
                rej();
            });
        }
        Shutdown.started = true;
        if (Shutdown.promises.length == 0) {
            return new Promise((res, rej) => {
                // Revised 8/30/18: Why was this set to execute only on debug?
                /* if (debug) { */
                    const ret = res();
                    if (ret && ret.then) {
                        ret.then(() => process.exit()).catch(() => process.exit());
                    } else {
                        process.exit();
                    }
                /* } else {
                    res();
                    process.exit();
                } */
            });
        }
        console.info('Shutting down.');
        Shutdown.bar = new ProgressBar(':bar ' +
            chalk.grey('(:current/:total steps) ') + chalk.yellow(':label'), {
                label: Shutdown.promises[0].label,
                total: Shutdown.promises.length,
                width: 40
            });
        const promises = [];
        Shutdown.promises.map((step) => {
            promises.push(step.promise());
        });
        return new Promise((res, rej) => {
            Promise.all(promises).then((results) => {
                results.map((result, idx) => {
                    if (result && result.err) {
                        console.error('An error occurred while shutting down:', 
                            chalk.grey(result.err));
                    }
                });  
                if (!debug) {
                    const ret = res();
                    if (ret && ret.then) {
                        ret.then(() => process.exit()).catch(() => process.exit());
                    } else {
                        process.exit();
                    }
                } else {
                    Shutdown.started = false;
                    res();
                }
            }).catch((e) => {
                // Should never get here.
                console.error(e);
                rej();
            });
        });
    }
}

Shutdown.promises = [];
Shutdown.hook();
module.exports = Shutdown;