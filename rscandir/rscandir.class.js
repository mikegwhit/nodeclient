'use strict';

const RScandirSortStrategy = {
    'DEPTH_FIRST': 0,
    'ALPHABETICAL': 1
};

const RScandirIgnoreStrategy = {
    'NONE': 0,
    'NODE_MODULES': 1,
    'DOT_FOLDERS': 2,
    'GITIGNORE': 3
};

/**
 * @class Recursive filesystem reader.  Includes filtering methods that utilize
 * wildcard's, RegEx and glob's.
 * 
 * @todo Reimplement caching.
 * @todo Add ignore strategy for GITIGNORE.
 */
class RScandir {
    constructor() {
        if (RScandir.instance) {
            return RScandir.instance;
        }
        RScandir.instance = this;
        this.chalk = require('chalk');
        this.filter = require(__dirname + '/rscandirfilter.class.js');
        this.fs = require('fs');
        /** @type {Object} A map of ignored files/strategies. */
        this.ignoring = {};
        this.rimraf = require('rimraf');
        this.scandir = require('scandir').create();
        this.setSort(RScandirSortStrategy.DEPTH_FIRST);
        this.setIgnore([RScandirIgnoreStrategy.NODE_MODULES, 
            RScandirIgnoreStrategy.DOT_FOLDERS]);
    }

    /**
     * Reads directory entries stored in cache.
     * @return {Promise} A promise when the read finishes.
     */
    batchRead() {
        let count, directories, resolveFn;
        count = 0;
        return new Promise((resolve) => {
            // reads in the rscandir cache of directories used last run
            // runs the async version of walk on each directory
            // after the last async run has finished, this should resolve
            try {
                directories = JSON.parse(this.fs.readFileSync(process.cwd() +
                    '/cache/rscandir.json'));
            } catch(e) {
                directories = [];
            }
            resolveFn = (dir, files) => {
                this.cacheFiles[dir] = files;
                count++;
                if (count == directories.length) {
                    resolve();
                }
            }

            for (let dir of directories) {
                this.walk(dir).then((function(dir) {return (files) => {
                    resolveFn(dir, files);
                }})(dir));
            }
        });
    }

    /**
     * Converts a directory to a filename, changing unusuable directory
     *     characters.
     * @param  {String} dir The directory string name to convert
     * @return {String} A standard string that can be used in a filename
     */
    convertDirToFilename(dir) {
        dir = dir.replace(/[/]/g, '_').replace(/[\.]/g, 'this') + '.json';
        if (RScandir.normalize(dir).indexOf(RScandir.normalize(process.cwd())) != -1) {
            dir = RScandir.normalize(dir);
            dir = dir.substr(dir.indexOf(RScandir.normalize(process.cwd()).length));
        }
        return dir;
    }

    /**
     * @return {Boolean} Returns true if directory has unusable character.
     */
    hasUnusableCharacter(dir) {
        let unusable = (dir.search(/[\?\"\<\>\|]/g) >= 0);
        unusable = unusable ||
            (dir.search(/[\:]/g) >= 0 && dir.search(/[\:]/g) > 2)
        return unusable;
    }

    /**
     * Normalize a pathname.
     */
    static normalize(path) {
        return require('path').resolve(path).replace(/\\/g, '/');
    }

    /**
     * Normalizes the directory name, removing leading slahes, forcing relative
     * directories.
     * @param  {string} dir The directory to normalize.
     * @return {string} Normalized directory.
     */
    normalizeDirectoryName(dir) {
        dir = RScandir.normalize(dir);
        if (dir.indexOf(RScandir.normalize(process.cwd())) != -1) {
            dir = dir.substr(process.cwd().length);
            if (dir.length == 0) {
                dir = '.';
            }
        }

        if (dir.substr(0, 1) == '/' || dir.substr(0, 1) == '\\') {
            dir = dir.substr(1);
        }

        if (RScandir.instance.hasUnusableCharacter(dir)) {
            console.warn(RScandir.instance.chalk.red('RScandir error: ') +
                'requested read with unusable directory name', dir);
        }
        return dir;
    }

    /**
     * Ignores either a file or if an integer is provided, an ignore strategy
     * is used.
     * @param {Array<String|Number>} files The files to ignore, or if a number 
     * sets an ignore strategy.
     */
    setIgnore(files) {
        this.ignoring = {};
        files.map((file) => {
            this.ignoring[file] = 0;
        });
    }

    /**
     * Sets the sort type.
     * @param {RScandirSortStrategy} type Either DEPTH_FIRST or ALPHABETICAL.
     */
    setSort(type) {
        this.sort = type;
    }

    /**
     * Function evaluates if a file should be ignored.
     * @todo Add GIT_IGNORE strategy.
     * @todo Add DOT_FOLDERS strategy.
     * @param {String} file The full filepath.
     * @return {Boolean} True if file should be ignored.
     */
    shouldIgnore(file) {
        const filename = file.split('/').slice(-1);
        if (this.ignoring.hasOwnProperty(RScandirIgnoreStrategy.NODE_MODULES) && 
            filename == 'node_modules') {
                return true;
            }
        return false;
    }

    /**
     * Asyncronous walk performed by the scandir NPM.
     * @param  {String} dir The directory being walked.
     * @return {Promise}     A promise that resolves with the files.
     */
    walk(dir) {
        let filelist = [];
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(RScandir.walkSync(dir));
            });
        });
    }

    /**
     * Walks directories recursively inside a folder.
     * @param  {String} dir The directory to scan.
     * @param {String} filter A wilcard string or a search string.
     * @return {Array} A list of all directories in dir.
     */
    walkDirectoriesSync(dir, filter) {
        let directories, file, files;
        directories = [];
        files = RScandir.walkSync(dir, filter, null, true);
        for (file of files) {
            if (RScandir.instance.fs.statSync(file)
                .isDirectory()) {
                directories.push(file);
            }
        }

        return directories;
    }

    /**
     * Recursively scans the directory.
     * @param  {String} dir The directory to scan.
     * @param {String|RegExp|{pattern: String|RegExp, exclude: Boolean}} filter 
     * If is a string, is a filter for wildstring/minimatch.  If is a RegExp, 
     * performs a match.  Exclude option may be set as an object.
     * @param  {?Array} recursion If in recursion, contains the current filelist
     * of subfolders.
     * @return {Array} A list of all files in dir.
     */
    static walkSync(dir, filter, recursion, includeDirectories) {
        let file, filelist, files, filteredFilelist, 
            nestedFilelist, recursions, result;
        recursions = 0;

        dir = RScandir.instance.normalizeDirectoryName(dir);
        // If includes a filter in the directory, automagically create filter.
        if (dir.includes('*')) {
            if (!filter || filter.length == 0) {
                filter = {
                    pattern: '',
                    type: dir.includes('**') ? 'glob': 'wildstring'
                };
            } else if (filter == 'glob' || filter == 'wildstring') {
                filter = {
                    pattern: '',
                    type: filter
                };
            }
            dir = dir.split('/').reduce((dir, part) => {
                if (part.includes('*')) {
                    if (filter.pattern.length > 0) {
                        filter.pattern += '/';
                    }
                    filter.pattern += part;
					return dir;
                } else if (filter.pattern.length > 0) {
                    filter.pattern += '/' + part;
					return dir;
                } else {
                    if (dir.length > 0) {
                        dir += '/';
                    }
                    return dir + part;
                }
            }, '');

            // if (filter.type == 'glob') {
                filter.pattern = dir + '/' + filter.pattern;
            // }
        }
        let filterObj = null;
        if (filter) {
            filterObj = new RScandir.instance.filter([], filter);
        }
        
        if (RScandir.Cache && RScandir.Cache.has('rscandir')) {
            let obj = RScandir.Cache.get('rscandir');
            if (obj.hasOwnProperty(RScandir.normalize(dir))) {
                return obj[RScandir.normalize(dir)];
            }
        }
        
        // If does not exist.
        if (!RScandir.instance.fs.existsSync(dir)) {
            console.warn('Attempted to readdir that does not exist', dir);
            return false;
        }
        files = RScandir.instance.fs.readdirSync(dir);

        // If part of recursion.
        if (arguments[2]
            && RScandir.instance.sort ==
            RScandirSortStrategy.ALPHABETICAL) {
            filelist = arguments[2];
        } else {
            filelist = [];
        }

        nestedFilelist = [];
        
        files.forEach((file) => {
            // If file does not exist, sometimes occurs with symlinks.
            if (!RScandir.instance.fs.existsSync(dir + '/' + file)) {
                return;
            }

            if (RScandir.instance.fs.statSync(dir + '/' + file)
                .isDirectory()) {
                if (RScandir.instance.shouldIgnore(dir + '/' + file)) {
                    return;
                }

                if (includeDirectories) {
                    filelist.push(dir + '/' + file);
                }
                
                if (filterObj == null || 
                    (!filterObj.match(dir + '/' + file) && filterObj.exclude) ||
                    !filterObj.exclude) {
                    result = RScandir.walkSync(dir + '/' + file, filter, 
                        filelist, includeDirectories);
                } else {
                    return;
                }

                // Increment recursions.
                recursions += result[1];

                // Concat results.
                nestedFilelist = nestedFilelist.concat(result[0]);
                if (RScandir.instance.sort ==
                    RScandirSortStrategy.ALPHABETICAL) {
                    filelist = nestedFilelist;
                    nestedFilelist = [];
                }
            } else {
                filelist.push(dir + '/' + file);
            }
        });

        if (RScandir.instance.sort ==
            RScandirSortStrategy.DEPTH_FIRST) {
            filelist = nestedFilelist.concat(filelist);
        }

        if (filter) {
            filelist = (RScandir.instance.filter.exec(filelist, filter));
        }
        
        // If not a recursion, return.
        if (!arguments[2]) {
            if (RScandir.Cache && RScandir.Cache.configs['rscandir']) {
                if (recursions > RScandir.Cache.configs['rscandir']['recursionThreshold'] || 
                    filelist.length > RScandir.Cache.configs['rscandir']['numFilesThreshold']) {
                        let cache = RScandir.Cache.get('rscandir');
                        if (!cache) {
                            cache = {};
                        }
                        cache[dir] = filelist;
                        RScandir.Cache.set('rscandir', cache, {
                            'persist': false
                        });
                    }
            }
            return filelist;
        } else {
            // If recursion.
            return [filelist, recursions];
        }
    }
}

RScandir.RScandirSortStrategy = RScandirSortStrategy;
RScandir.RScandirIgnoreStrategy = RScandirIgnoreStrategy;
(new RScandir());
module.exports = RScandir;