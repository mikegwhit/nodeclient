const Override = require('ncli-core-helpers').Override;

/**
 * Console provides console throttling and blacklisting/whitelisting support.
 * Provides standardized formatting for console messages.  Summary mode supplies
 * a regular summary of how many and what type of log messages occurred for 
 * each package.
 * 
 * If a package is on blacklist, the console messages are always logged.  If on 
 * the whitelist, the console messages are always displayed.  If on the summary
 * list, the messages are logged and summarized.  Only if console.logWhitelist
 * is true, then whitelisted packages are logged to the filesystem.  If a 
 * package is on none of the lists, then it is subject to throttling heuristics.
 * 
 * Blacklisting and whitelisting may be applied to subfolders.  A whitelisted 
 * match always has higher priority than a blacklist match.
 * @class
 * @todo Provide squelching of child threads.
 * @todo Add throttling such that summaries are displayed.
 */
class Console {
    constructor() {
        if (!Console.instance) {
            Console.instance = this;
        } else {
            return Console.instance;
        }

        /**
         * The blacklisted packages are never shown in the console.
         */
        this.blacklist = [];

        this.chalk = require('chalk');

        /** 
         * Stores the state of each file or grouping, including number of logs,
         * whether or not the file has been throttled, and the throttle start
         * time.
         * @type {Object}
         */
        this.fileStates = {};

        /**
         * Just a reference to the class for static members access.
         */
        this.class = Console;

        /** 
         * Stores the state of each package.  Stores similar information to 
         * fileStates, but for entire package.
         * @type {Object}
         */
        this.packageStates = {};

        /**
         * The whitelisted packages are always shown in the console.
         */
        this.whitelist = [];

        this.overrideConsole();

        this.files = require('ncli-core-files');
        this.configs = require('ncli-core-configs');
        this.logger = require('ncli-core-logger');

        this.thresholds = '';

        this.initializeThresholds();
        this.ready = true;
    }

    /**
     * Adds to the whitelist.
     */
    addToWhitelist(packageName) {
        const whitelist = this.configs['console']['whitelist'];
        if (whitelist.indexOf(packageName) == -1) {
            whitelist.push(packageName);
        }
    }

    /**
     * Checks if a file has been throttled for output.
     * @param {String} packageName The package name to check.
     * @param {String} filename Input filename to check for.
     * @return {Boolean} Returns true if filename is throttled.
     * @todo Add support for file-level throttling.
     */
    checkThrottled(packageName, filename) {
        if (this.fileStates.hasOwnProperty(filename)) {
            if (this.fileStates[filename]['count'] >= this.thresholdCount) {
                this.fileStates[filename]['throttled'] = true;
                // return true;
            }
        }
        if (Console.isListed(packageName, this.configs['console']['whitelist'])) {
            return false;
        }
        if (Console.isListed(packageName, this.configs['console']['blacklist'])) {
            return true;
        }
        if (this.packageStates.hasOwnProperty(packageName)) {
            if (this.packageStates[packageName]['count'] >= this.thresholdCount) {
                this.packageStates[packageName]['throttled'] = true;
                return true;
            } else if (Console.isListed(packageName, this.configs['console']['summary'])) {
                return true;
            }
        }

        return false;
    }
    
    /**
     * Logs an error message.
     */
    static error(message) {
        Console.log(message, 'error');
    }

    /**
     * Increments counter each time a console message is logged, storing the
     * counter by a particular file.
     * @param {String} packageName The package to increment for.
     * @param {String} filename The file to increment for.
     * @param {Boolean} throttled If true, increment the throttled counts.
     */
    incrementCounter(packageName, filename, throttled = false, level = 'log') {
        if (!this.fileStates[filename]) {
            this.fileStates[filename] = this.getDefaultStateObject();
        }
        if (!this.packageStates[packageName]) {
            this.packageStates[packageName] = this.getDefaultStateObject();
        }
        this.fileStates[filename]['count']++;
        this.fileStates[filename]['numThrottled'][level]++;
        this.packageStates[packageName]['count']++;
        this.packageStates[packageName]['numThrottled'][level]++;
        setTimeout(() => {
            this.fileStates[filename]['count'] = 
                Math.max(0, --this.fileStates[filename]['count']);
            this.packageStates[packageName]['count'] = 
                Math.max(0, --this.packageStates[packageName]['count']);
        }, this.thresholdCooldown);
    }
    
    /**
     * Logs an info message.
     */
    static info(message) {
        Console.log(message, 'info');
    }

    /**
     * Sets the amount of logging tolerated per file given a duration.  If a
     * file is spamming console, then a consolidated error message will be
     * displayed as an alternative.
     */
    initializeThresholds() {
        this.thresholdCooldown = this.configs['console']
            ['thresholdCooldown'];
        this.thresholdCount = this.configs['console']
            ['thresholdCount'];
        this.thresholdDuration = this.configs['console']
            ['thresholdDuration'];
    }

    /**
     * Returns the default state of a file.
     */
    getDefaultStateObject() {
        return {
            count: 0,
            throttled: false,
            numThrottled: {
                error: 0,
                info: 0,
                log: 0,
                warn: 0
            }
        };
    }

    /**
     * Log a message.  Displays a formatted log message.  Gets to this only if
     * packageName is not blacklisted or explicitly invoked.
     * @param {String} message The message to log.
     * @param {String} level The level of log, could be info|log|warn|error.
     * @param {String} packageName The package name logging.  If no packageName
     * supplied, then find package.
     * @param {String} filename The filename logging.  If no filename supplied,
     * then find filename.
     */
    static log(message, level, packageName = '', filename = '') {
        const chalk = require('chalk');
        const fn = `_${level.toLowerCase()}`;
        switch (level) {
            case 'error':
                level = `[${chalk.red('Error')}]`;
            break;
            case 'info':
                level = `[${chalk.cyan('Info')}]`;
            break;
            case 'log':
                level = `[${chalk.gray('Log')}]`;
            break;
            case 'warn':
                level = `[${chalk.yellow('warn')}]`;
            break;
        }
        const packageString = `[${chalk.blue(packageName)}]`;
        Console[fn].apply(console, [packageString, level, ...message]);
    }

    /**
     * @returns {Boolean} True if the package is on the list.  Used for
     * whitelist, blacklist, summary list checks.
     */
    static isListed(packageName, list) {
        return list.reduce((ret, item) => {
            if (item.includes('*')) {
                if (require('wildstring').match(item, packageName)) {
                    return true;
                }
            } else {
                if (packageName == item) {
                    return true;
                }
            }
            return false || ret;
        }, false);
    }

    /**
     * Override the console functions.  This includes a throttle check and a 
     */
    overrideConsole() {
        console._error = Console._error = this.consoleError = console.error;
        console._info = Console._info = this.consoleInfo = console.info;
        console._log = Console._log = this.consoleLog = console.log;
        console._warn = Console._warn = this.consoleWarn = console.warn;

        // override console functions
        const createOverrideFn = ((level) => {
            return (function() {
                if (!this.ready) {
                    return;
                }
                let filename = this.files.getCallerFile(2);
                if (!filename) {
                    filename = 'unknown';
                }
                // this.consoleInfo(filename,  arguments, this.fileStates);
                let packageObj = this.files.getPackageObject(filename, true);
                let packageName = '';
                let friendlyPackageName = '';
                if (packageObj && packageObj['friendlyName'] && 
                    packageObj['friendlyName'].length > 0) {
                        friendlyPackageName = packageObj['friendlyName'];
                        if (friendlyPackageName.substr(-1).charCodeAt(0) > 255) {
                            friendlyPackageName += ' ';
                        }
                        packageName = packageObj['name'];
                    } else if (packageObj) {
                        friendlyPackageName = packageObj['name'];
                        packageName = packageObj['name'];
                    } else {
                        packageName = 'unknown';
                        friendlyPackageName = 'unknown';
                    }
                const throttled = this.checkThrottled(packageName, filename);
                if (!throttled) {
                    const args = Array.from(arguments).slice(1);
                    Console.log(args, level, friendlyPackageName, filename);
                } else {
                    this.storeLog(packageName, filename, arguments, level);
                }
                this.incrementCounter(packageName, filename, throttled, level); // logging for error level
            }).bind(this);
        });

        Console.errorOverride = this.consoleErrorOverride = 
            new Override('console.error', createOverrideFn('error'), console);
        Console.infoOverride = this.consoleInfoOverride = 
            new Override('console.info', createOverrideFn('info'), console);
        Console.logOverride = this.consoleLogOverride = 
            new Override('console.log', createOverrideFn('log'), console);
        Console.warnOverride = this.consoleWarnOverride = 
            new Override('console.warn', createOverrideFn('warn'), console);
    }
    
    /**
     * Removes from the whitelist.
     */
    removeFromWhitelist(packageName) {
        const whitelist = this.configs['console']['whitelist'];
        const idx = whitelist.indexOf(packageName);
        if (idx != -1) {
            whitelist.splice(idx, 1);
        }
    }

    /**
     * Resets all file and package counters.
     */
    resetStates() {
        for (let filename in this.fileStates) {
            this.fileStates[filename] = this.getDefaultStateObject();
        }
        for (let packageName in this.packageStates) {
            this.packageStates[packageName] = this.getDefaultStateObject();
        }
    }

    /**
     * Restores the original console functions.
     */
    restoreConsole() {
        Console.restoreConsole();
    }

    /**
     * Restores the original console functions.
     */
    static restoreConsole() {
        Console.errorOverride.reset();
        Console.infoOverride.reset();
        Console.logOverride.reset();
        Console.warnOverride.reset();
    }

    /**
     * Stores a log to the logger service.  Indicates an object containing the
     * type as console, args as what was sent to the console, and the filename
     * where the message originated.
     * @param {String} packageName The package being logged for.
     * @param {String} filename The filename being stored for.
     * @param {Array} args The arguments passed to the console.
     * @param {String} level The level of log, could be info|log|warn|error.
     */
    storeLog(packageName, filename, args, level = 'info') {
        this.addToWhitelist('ncli-core-files'); 
        if (!this.logger.logs[packageName]) {
            this.logger.create(packageName, 
                packageName, 'console');
        }
        this.removeFromWhitelist('ncli-core-files');
        this.logger.send(packageName, {
            type: 'console',
            args,
            filename
        }, level == 'log' ? 'info' : level).then(() => {
        }).catch((e) => {
        });
    }

    /**
     * Outputs buffered console content previously throttled.
     */
    throttleOutput() {
        // [Filename] logged 3 errors, 2 warnings, 1 log message in the last [duration]
    }
    
    /**
     * Logs an warn message.
     */
    static warn() {
        Console.log(message, 'warn');
    }
}

module.exports = new Console();
module.exports.class = Console;