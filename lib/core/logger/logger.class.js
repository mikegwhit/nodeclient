/**
 * Logger a simple, file-based interface to Winston. 
 * @class
 */
class Logger {
    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }
        Logger.instance = this;

        this.configs = require('ncli-core-configs');
        this.files = require('ncli-core-files');
        this.winston = require('winston');

        /** @type {Object<String, Logger>} An object of loggers, stored by key. */
        this.logs = {};

        /** @type {Object<String, Logger>} An object of loggers, stored by File. */
        this.logsByFile = {};

        process.on('logger.cleanup', this.onShutdown.bind(this));
    }

    /**
     * Creates a log file and maps it to a key.
     * @param {String} key The identifier for the logger.
     * @param {String} file The log file.
     * @param {String} subfolder
     * @param {Boolean} temporary If true, deletes file on progam exit.
     */
    create(key, file = '', subfolder = '', temporary = false) {
        if (file.length == 0) {
            file = key;
        }

        if (subfolder.length > 0) {
            subfolder = `${subfolder}/`;
        }

        if (!file) {
            file = 'unknown';
        }

        if (this.logs[key]) {
            return;
        }

        if (this.logsByFile[this.filepath(file, subfolder)]) {
            // Already an existing logger created, so reuse.
            this.logs[key] = this.logsByFile[this.filepath(file, subfolder)];
            return;
        }
        
        this.files.createLocalFile(this.configs['logger']['folder'], 
            subfolder + file + '.log', '', temporary);

        // Use standard config options.
        const fileConfig = Object.assign(this.configs['logger']['winston'], {
            name: key,
            filename: this.filepath(file, subfolder)
        });
        
        try {
            // Remove in case logger already exists.
            this.winston.loggers.close(this.logs[key]);
        } catch(e) {
        }

        try {
            if (key == 'console') {
                fileConfig.name = '_console';
            }
            // Add as separate logger.
            this.winston.loggers.add(key, {
                file: fileConfig
            });
        } catch(e) {
            // Error thrown if console already removed.
            console.warn(e);
        }

        this.logs[key] = this.winston.loggers.get(key);
        this.logs[key].file = fileConfig.filename;
        this.logsByFile[fileConfig.filename] = this.logs[key];
        this.logsByFile[fileConfig.filename].key = key;
        
        try {
            this.logs[key].remove(this.winston.transports.Console);
        } catch(e) {
            console.warn(e);
        }
    }

    /**
     * Deletes all log files!
     * @param {Boolean} temporaryLogs If true, only deletes temporary logs.
     */
    deleteAll(temporaryLogs = false) {
        for (const file in this.logsByFile) {
            this.delete(file);
        }
    }

    /**
     * Deletes a log file.
     * @param {String} file The log file.
     * @param {String} subfolder
     */
    delete(file, subfolder = '', deleteFile = false) {
        try {
            file = this.filepath(file, subfolder);
            this.winston.loggers.close(this.logsByFile[file].key);
            this.logsByFile[file].clear();
            if (deleteFile) {
                require('fs').unlinkSync(file);
            }
            delete this.logs[this.logsByFile[file].key];
            delete this.logsByFile[file];
        } catch(e) {
            console.log(e);
        }
    }

    /**
     * Gets the file path for a log, allowing subfolder customization.
     * @param {String} file The log file.
     * @param {String} subfolder
     * @returns {String} The log folder relative to the main directory.
     */
    filepath(file, subfolder = '') {
        const folder = this.configs['logger']['folder'];
        if (subfolder.length > 0) {
            subfolder = `${subfolder}/`;
        }
        if (file.startsWith(`${this.files.getMainDirectory()}`)) {
            return file;
        }
        return `${this.files.getMainDirectory()}/${folder}/${subfolder}${file}.log`;
    }

    /**
     * Called on shutdown, deletes all loggers. Only deletes temporary files.
     */
    onShutdown() {
        return new Promise((res, rej) => {
            try {
                this.deleteAll(true);
            } catch(e) {
                console.warn(e);
            }
            res();
            // this.files.onShutdown().then(res).catch(rej);
        });
    }

    /**
     * Queries the provided key.
     * @param {String} key The lookup key associated with the log file.
     * @param {Object} query Query for the log file.  This follows the Winston
     * logging API found here: https://www.npmjs.com/package/winston#querying-logs
     * @param {Function} filter A function that filters each log for return 
     * result inclusion.
     */
    query(key, query, filter) {
        return new Promise((resolve, reject) => {
            this.logs[key].query(query, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * Logs a message to the stored key.
     * @param {String} key The logger to use.
     * @param {String|Object|Array} message The message to send.  If array is 
     * provided, logs multiple messages.
     * @param {String} level The level of message to send.
     */
    send(key, message, level = 'info', preserveOrder = false) {
        return new Promise((resolve, reject) => {
            const size = require('fs').statSync(this.logs[key].file).size;
            if (typeof message == 'object') {
                message = JSON.stringify(message);
            }
            const checkFile = () => {
                const newSize = require('fs').statSync(this.logs[key].file).size;
                if (newSize == size) {
                    setTimeout(checkFile, 100);
                } else {
                    resolve();
                }
            }
            checkFile();

            this.logs[key].log(level, message, {key}, () => {
            });
        });
    }

    /**
     * Sets the rotation size for a given key.
     * @param {String} fileOrKey The key or file to retrieve for.
     * @param {Number} size The number of bytes to limit rotation by.
     */
    setRotation(fileOrKey) {
        // Limit the size of the particular log.
    }

    /**
     * Gets the last howMany rows from the log stored by key.
     * @param {String} fileOrKey The key or file to retrieve for.
     * @param {Number} howMany How many records to grab.
     */
    tail(fileOrKey, howMany = 10) {
        // Return a query of the last 10 results.
    }

    /**
     * Truncates all logs for a file associated with a given key.
     * @param {String} fileOrKey The key or file to retrieve for.
     * @todo Only truncate log messages with a given key.
     */
    truncate(fileOrKey) {
        // Empty the provided file.
    }

    /**
     * Zips up the given file.
     * @param {String} fileOrKey The key or file to retrieve for.
     */
    zip(fileOrKey) {
        // TODO: Determine if log zipping is supported or handled by Winston.
    }
}

const logger = new Logger();
process.on('logger.cleanup', logger.onShutdown.bind(logger));
require('ncli-core-helpers').Shutdown.require(logger.onShutdown.bind(logger));
module.exports = logger;