'use strict';

/**
 * Wraps the Files object to provide more articulated control over
 * JSON-based configuration files.  Allows defaults and overrides to be used.
 * @todo Allow current configs to be programmatically saved.
 * @todo Allow CLI to specify config overrides.
 * @class
 */
class Configs {
    constructor() {
        if (!Configs.instance) {
            Configs.instance = this;
        } else {
            return Configs.instance;
        }
        /** @type {Object} defaults */
        this.defaults = {};
        /** @type {Object} lastRead array of configs */
        this.lastRead   = {};
        /** @type {Object} overrides stored for overriding programmatically */
        this.overrides = {};

        this.chalk  = require('chalk');
        this.deepAssign = require('deep-assign');
        this.fs     = require('fs');
        this.files  = require('ncli-core-files');
        this.path   = require('path');
        this.readline  = require('readline');

        this.loadDefaultsAndOverrides();

        process.on('Tests Setting Up Routes', 
            this.setupRoutes.bind(this));
    }

    /**
     * Returns all configs.
     * @return {Object} The last read configs.
     */
    all() {
        return this.lastRead;
    }

    /**
     * Attempts to reset the configs object.
     */
    cleanup() {
        this.lastRead = {};
        this.defaults = {};
        this.overrides = {};
    }

    /**
     * Creates a temporary config that is deleted at the end of the process
     * lifetime.
     * @param {String} name The name of the config file.
     * @param {Object} contents The JSON object to write to the file.
     * @return {Boolean} 
     */
    createConfig(name, contents) {
        this.files.createLocalFile('configs', name, JSON.stringify(contents), 
            true);
        this.readConfigs();
    }

    /**
     * Gets the last read configs.
     * @param {string} file The file key to read for.
     * @return {Object} Config matching file.
     */
    get(file) {
        if (this.lastRead.hasOwnProperty(file)) {
            return this.lastRead[file];
        }
        return false;
    }

    /**
     * Include relevant packages.
     * @todo Remove the shoddy cache effort.
     */
    loadDefaultsAndOverrides() {
        if (!this.fs.existsSync(__dirname + '/.cache')) {
            this.fs.mkdirSync(__dirname + '/.cache');
        }
        try {
            this.defaults = JSON.parse(this.fs.readFileSync(__dirname +
                '/.cache/defaults.json', 'UTF8'));
        } catch(e) {
        }
        try {
            this.overrides = JSON.parse(this.fs.readFileSync(__dirname +
                '/.cache/overrides.json', 'UTF8'));
        } catch(e) {
        }
    }

    /**
     * Using a files object, reads those files as configs filtering for .json
     * files and then applying defaults/overrides appropriately.
     * @param  {Array} files An array of files.
     * @return {Object<String, Object>} A configs object keyed by file, then a JSON object of
     * configs identified by that file.
     */
    parseFiles(files) {
        let config, configs, file, filename;
        configs = {};
        for (file of files) {
            if (typeof file != 'string') {
                continue;
            }
            file        = file.replace(/\\/g, '/');
            filename    = file.split('/');
            filename    = filename[filename.length - 1];
            if (filename.split('.').pop() != 'json') {
                continue;
            }
            filename    = filename.split('.').slice(0, -1).join('.');
            try {
                config = JSON.parse(this.fs.readFileSync(file, 'UTF8'));
            } catch(e) {
                console.error(this.chalk.red('Configs Error: ') +
                    'had trouble reading the config ' +
                    this.chalk.yellow(filename) +
                    '.  Please check that the file contains valid JSON ' +
                    'syntax and try again: ' + file);
            }
            if (!this.defaults.hasOwnProperty(filename)) {
                this.defaults[filename] = {};
            }
            if (!this.overrides.hasOwnProperty(filename)) {
                this.overrides[filename] = {};
            }

            if (!configs[filename]) {
                configs[filename] = {};
            }
            configs[filename]    = this.deepAssign(this.defaults[filename],
                configs[filename], config, this.overrides[filename]);
        }

        this.lastRead = configs;
        return this.lastRead;
    }

    /**
     * Reads command-line for inputs.  If an argument maps to an existing 
     * config value, the config value is overwritten.  Must specify command-line 
     * argument to address PACkAGE_NAME['option']=VALUE.  By default, if no 
     * subscript exists, then the package name of the executing package is 
     * used unless a config key is specified in the executing package's 
     * package.json file.
     */
    readCLI() {

    }

    /**
     * Reads the configs using the Files API.
     * @param  {String} fromFolder A folder to read from using the Files API.
     * @param  {function} updateFn Function to call when new configs are added.
     * @param  {number} updateInterval Time between checks on configs folder.
     * @param  {Boolean} forceRefresh If true, disallows caching.
     * @return  {Object<String, Object>} Configs read into an object,
     * using the filenames as a key.
     */
    readConfigs(fromFolder, updateFn, updateInterval, forceRefresh = false) {
        let files;
        if (typeof fromFolder == 'undefined') {
            fromFolder  = 'configs';
        }
        if (typeof updateFn != 'undefined' && updateFn != null) {
            files   = this.files.readFiles(fromFolder, (newFiles) => {
                updateFn(this.parseFiles(newFiles), -1, true);
            }, updateInterval);
        } else {
            let skipLocalPackages = false;
            // TODO: Somehow utilize the configured cache folder name.
            let FileScanner = require('ncli-core-files/filescanner.class.js');
            let FileHelpers = require('ncli-core-files/filehelpers.class.js');
            if (!this.files.Cache.set) {
                let cacheFiles = this.files.readLocalFiles('.cache');
                let cachedConfigs = cacheFiles.find((file) => {
                    return file.includes('localFiles');
                });
                if (cachedConfigs && !FileScanner.Cache.set) {
                    cachedConfigs = JSON.parse(require('fs').readFileSync(cachedConfigs, 'utf8'));
                    Object.assign(FileScanner.filesCache.objects, cachedConfigs.value);
                }

                let cachedPackages = cacheFiles.find((file) => {
                    return file.includes('packages.json');
                });
                if (cachedPackages && !FileHelpers.Cache.set) {
                    cachedPackages = JSON.parse(require('fs').readFileSync(cachedPackages, 'utf8'));
                    Object.assign(FileHelpers.packagesCache.objects, cachedPackages.value);
                }
                skipLocalPackages = true;
            }
            let tmpFilesCache = {};
            let tmpPackagesCache = {};
            if (forceRefresh) {
                // TODO: This should be less hacky/more generalized.
                tmpFilesCache = FileScanner.filesCache;
                tmpPackagesCache = FileHelpers.packagesCache;
                FileScanner.filesCache = {objects:{}};
                FileHelpers.packagesCache = {objects:{}};
            }
            files   = this.files.readFiles(fromFolder, null, null, skipLocalPackages);
            if (forceRefresh) {
                FileScanner.filesCache = tmpFilesCache;
                FileHelpers.packagesCache = tmpPackagesCache;
            }
        }
        return this.parseFiles(files);
    }

    /**
     * Sets a default for a particular settings config.  This is super handy if
     * you are authoring a library without expecting a config to exist/want to
     * ensure a block of code has no failure by way of a config access.
     * @param {String} file Filename to set the defaults for.
     * @param {Object} settings Settings object to load in.
     */
    setDefault(file, settings) {
        this.defaults[file] = settings;
        if (!this.lastRead[file]) {
            this.lastRead[file] = {};
        }
        this.lastRead[file] = this.deepAssign(settings, this.lastRead[file]);
        if (!this.fs.existsSync(__dirname + '/.cache')) {
            this.fs.mkdirSync(__dirname + '/.cache');
        }

        try {
            this.fs.writeFileSync(__dirname + '/.cache/defaults.json',
                JSON.stringify(this.defaults));
        } catch(e) {
            console.log(e);
        }
    }

    /**
     * Sets a programmatic override for configs such that a reread will always
     *     be overridden.
     * @param {String} file     File/key for override.
     * @param {Object} settings Object to override with.
     */
    setOverride(file, settings) {
        this.overrides[file] = settings;
        if (!this.lastRead[file]) {
            this.lastRead[file] = {};
        }
        if (!this.defaults[file]) {
            this.defaults[file] = {};
        }
        this.lastRead[file] = this.deepAssign(this.defaults[file],
            this.lastRead[file], settings);

        this.fs.writeFileSync(__dirname + '/.cache/overrides.json',
            JSON.stringify(this.overrides));
    }

    /**
     * Setting up routes.
     */
    setupRoutes(app) {
        app.all('/configs/get', function(req, res, next) {
            res.send(this.lastRead);
        }.bind(this));
    }
}

module.exports = new Configs();