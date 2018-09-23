const FileHelpers = require(__dirname + '/filehelpers.class.js');
const FileWriter = require(__dirname + '/filewriter.class.js');
const RScandir = require('ncli-core-rscandir');

const FileScannerStrategy = {
    ALL_PACKAGES: 0,
    WHITE_LIST: 1,
    BLACK_LIST: 2,
    ONLY_NODE_MODULES: 3,
    NO_NODE_MODULES: 4
};

/**
 * Mocks Node.js filesystem.  Reads files relative to packages.  Is compatible
 * for node_modules packages as well as finding package.json files in a 
 * directory.  Provides strategies for including or excluding packages.
 * @class
 */
class FileScanner {
    /**
     * Adds search paths such that when a request for all files is made, search
     * paths are used in addition to the current packages node_modules folder.
     * @param {Array<String>|String} paths The paths to add.
     */
    static addPaths(paths) {
        if (typeof paths == 'string') {
            paths = [paths];
        }
        if (!FileScanner.searchPaths) {
            FileScanner.searchPaths = [];
        }
        FileScanner.searchPaths = FileScanner.searchPaths.concat(paths);
    }

    /**
     * Adds a strategy.  Removes strategies that are no longer compatible with
     * the added type.
     */
    static addStrategy(type) {
        if (!FileScanner.strategies) {
            FileScanner.strategies = {};
        }
        FileScanner.strategies[type] = true;
        if (type == FileScannerStrategy.ONLY_NODE_MODULES) {
            FileScanner.removeStrategy(FileScannerStrategy.NO_NODE_MODULES);
        }
        if (type == FileScannerStrategy.NO_NODE_MODULES) {
            FileScanner.removeStrategy(FileScannerStrategy.ONLY_NODE_MODULES);
        }
        if (type == FileScannerStrategy.BLACK_LIST) {
            FileScanner.removeStrategy(FileScannerStrategy.WHITE_LIST);
        }
        if (type == FileScannerStrategy.WHITE_LIST) {
            FileScanner.removeStrategy(FileScannerStrategy.BLACK_LIST);
        }
        FileHelpers.strategies = FileScanner.strategies;
        FileHelpers.strategyTypes = FileScannerStrategy;
    }

    /**
     * Blacklists folders from being included in a file scan.  Changes strategy
     * to disallow folders in the blacklist.
     * @todo Needs better data validation and testing.
     */
    static blacklist(folders) {
        FileScanner.blacklisted = folders;
        FileHelpers.blacklisted = FileScanner.blacklisted;
        FileScanner.addStrategy(FileScannerStrategy.BLACK_LIST);
    }

    /**
     * Once the cache saves, this function is called.
     * @todo This is very similar to filescanner.class.js implementation. Should de-dupe the code.
     */
    static onSaveCache(key, val) {
        if (key == 'localFiles') {
            const cache = FileScanner.Cache.objects[key];
            const cacheCopy = Object.assign({}, FileScanner.Cache.objects[key]);
            let keys = {};
            for (let path in cache.value) {
                let dependencyChain = path.split('/node_modules');
                let leafPackage = dependencyChain.pop();
                let cachePath = dependencyChain.join('/node_modules');
                let realPath = 
                    FileHelpers.normalize(require('fs')
                    .realpathSync(FileHelpers.normalize(cachePath)));
                if (!keys[realPath]) {
                    keys[realPath] = Object.assign({}, cache);
                    keys[realPath].value = {};
                }
                keys[realPath].value[realPath + '/node_modules' + leafPackage] =
                    cache.value[path];
            }
            for (let key in keys) {
                keys[key].length = JSON.stringify(keys[key].value).length;
                let cache = keys[key];
                let folder = '.cache/';
                if (FileScanner.Cache.configs['cache']) {
                    folder = FileScanner.Cache.configs['cache']['folder'] + '/';
                }
                let file = key + '/' + folder + cache.prefix + cache.key + 
                    '.json';
                FileScanner.Cache.files.writeFile(file, JSON.stringify(cache, null, 2), true, 'utf8');
            }
        }
    }

    /**
     * Reads all files from node_modules filesystem and the local process
     * folder.
     * @param  {String} fromFolder The folder from which to read.
     * @param  {boolean} noRead If false, does not rscandir the folders.
     * @param  {number} updateInterval The interval time to use for checking
     *     for updates.
     * @return {Array} An array of files read from each package in node_modules.
     */
    static readAllFiles(fromFolder, noRead = false, updateInterval, skipLocalPackages = false) {
        let files, i, packagePath, packages, path;
        updateInterval = updateInterval || 5000; // every 5s
        if (arguments[4] && typeof arguments[4] != 'function') {
            path = arguments[4];
        } else {
            path = '';
        }
        files = [];
        let longFileNames = [];
        let hasCache = false;
        if (FileScanner.Cache.set) {
            let obj = FileScanner.Cache.get('localFiles');
            if (!obj) {
                obj = {};
                FileScanner.Cache.set('localFiles', obj, {
                    persist: true
                });
            } else {
                hasCache = Object.keys(obj).reduce((hasCache, key) => {
                    if (key.endsWith(fromFolder)) {
                        hasCache = true;
                    }
                    return hasCache;
                }, false);
            }
        } else {
            hasCache = Object.keys(FileScanner.filesCache.objects).reduce((hasCache, key) => {
                if (key.endsWith(fromFolder)) {
                    hasCache = true;
                }
                return hasCache;
            }, false);
        }
        packages = FileHelpers.getPackages(path, true, skipLocalPackages);
        // packages = FileHelpers.getNodeModulePackages(path, skipLocal);
        for (let aPackage of packages) {
            if (aPackage == '.') {
                continue;
            }
            if (aPackage.toString().length > 200) {
                longFileNames.push(aPackage.toString());
                continue;
            }
            let _packagePath = '';
            try {
                if (!skipLocalPackages && require('fs').lstatSync(aPackage)
                    .isSymbolicLink()) {
                    _packagePath = aPackage;
                    packagePath = require('fs').readlinkSync(aPackage).replace(/\\/g, 
                        '/');
                } else {
                    _packagePath = packagePath = aPackage;
                }
            } catch(e) {
                _packagePath = packagePath = aPackage;
            }
            if (hasCache && !arguments[4] && _packagePath.includes('node_modules')) {
                continue;
            }
            try {
                /* if (require('fs').lstatSync(packagePath).isDirectory()) */ {
                    if (require('fs').existsSync(packagePath +
                        '/' + fromFolder)) {
                        if (noRead) {
                            files.push(packagePath + '/' + fromFolder);
                        } else {
                            // Cache Magic.
                            if (FileScanner.Cache.set) {
                                let obj = FileScanner.Cache.get('localFiles');
                                if (obj[packagePath + '/' + fromFolder] && 
                                    packagePath.includes('node_modules')) {
                                    files = obj[packagePath + '/' + fromFolder]
                                        .concat(files);
                                } else {
                                    files = (RScandir(_packagePath + '/' + fromFolder));
                                    if (packagePath.includes('node_modules') ||
                                        _packagePath.includes('node_modules')) {
                                        obj[packagePath + '/' + fromFolder] = files;
                                        if (packagePath.includes('node_modules')) {
                                            obj[FileHelpers
                                                .normalize(packagePath + '/' + 
                                                fromFolder)] = files;
                                        } else {
                                            obj[FileHelpers
                                                .normalize(_packagePath + '/' + 
                                                fromFolder)] = files;
                                        }
                                        FileScanner.Cache.set('localFiles', obj, {
                                            persist: true
                                        });
                                    }
                                    files = files.concat(files);   
                                }
                            } else {
                                if (FileScanner.filesCache.objects[_packagePath + '/' + fromFolder]) {
                                    files = FileScanner.filesCache.objects[_packagePath + '/' + fromFolder];
                                } else {
                                    files = (RScandir(_packagePath + '/' + fromFolder))
                                        .concat(files);   
                                }
                                if (packagePath.includes('node_modules') ||
                                    _packagePath.includes('node_modules')) {
                                        if (packagePath.includes('node_modules')) {
                                            FileScanner
                                                .filesCache.objects[FileHelpers
                                                .normalize(packagePath + '/' + 
                                                fromFolder)] = files;
                                        } else {
                                            FileScanner
                                                .filesCache.objects[FileHelpers
                                                .normalize(_packagePath + '/' + 
                                                fromFolder)] = files;
                                        }
                                    }
                            }
                        }
                    }
                    // TODO: update for symlinks
                    if (require('fs').existsSync(aPackage + 
                        '/node_modules')) {
                        if (aPackage.substr(0, process.cwd().length) == 
                            process.cwd()) {
                                aPackage = 
                                    aPackage.substr(process.cwd().length);
                            }
                        files = (FileScanner.readAllFiles(fromFolder,
                            noRead, updateInterval,
                            skipLocalPackages, aPackage)).concat(files);
                    }
                }
            } catch(e) {
            }
        }

        /*
        TODO: Reimplement as watcher class.
        if (updateFn) {
            this.lastRead[fromFolder] = files;
            this.createUpdateTimer(fromFolder, updateFn, updateInterval);
        }
        */

        if (!arguments[4]) {
            files = files.concat(FileScanner.readLocalFiles(fromFolder, noRead));
        }
        if (longFileNames.length > 0) {
            // console.warn('Filenames detected longer than 200 characters.');
        }

        return files;
    }

    /**
     * @param  {String} fromFolder The folder from which to read.
     * @param  {function(Array)} updateFn Function will call with new results
     *     when they occur.
     * @param  {number} updateInterval The interval time to use for checking
     *     for updates.
     * @return {Array} A listing of files.
     */
    static readFiles(fromFolder, updateFn, updateInterval, skipLocalPackages = false) {
        let files;
        files = FileScanner.readAllFiles(fromFolder, false, updateInterval, skipLocalPackages);
        /*
        TODO: Reimplement as watcher class.
        if (updateFn) {
            this.lastRead[fromFolder] = files;
            this.createUpdateTimer(fromFolder, updateFn, updateInterval);
        }
        */
        return files;
    }

    /**
     * Reads files from the fromFolder.
     * @param  {String} fromFolder The folder from which to read.
     * @param  {boolean} noRead If false, does not rscandir the folders.
     * @param  {number} updateInterval The interval time to use for checking
     *     for updates.
     * @return {Array} A listing of files.
     */
    static readLocalFiles(fromFolder, noRead, updateInterval) {
        let curPath, files;
        updateInterval = updateInterval || 5000; // every 5s
        files = [];
        curPath = FileHelpers.normalize(process.cwd() + '/' + fromFolder);
        if (FileScanner.Cache.set) {
            let obj = FileScanner.Cache.get('localFiles');
            if (obj && typeof obj == 'object' && obj.hasOwnProperty(curPath)) {
                return obj[curPath];
            }
        } else if (FileScanner.filesCache.objects[curPath]) {
            return FileScanner.filesCache.objects[curPath];
        }
        if (require('fs').existsSync(curPath)) {
            if (noRead) {
                files.push(curPath);
            } else {
                files = files.concat(RScandir(curPath));
            }
        } else {
            // console.warn('The requested read folder does not exist!', 
                // curPath, fromFolder);
            files = [];
        }
        if (FileScanner.Cache.set && !noRead && curPath.includes('node_modules')) {
            let obj = FileScanner.Cache.get('localFiles');
            if (!obj) {
                obj = {};
            }
            obj[FileHelpers.normalize(curPath)] = files;
            FileScanner.Cache.set('localFiles', obj, {
                persist: true
            });
        } else if (!FileScanner.Cache.set) {
            FileScanner.filesCache.objects[FileHelpers.normalize(curPath)] = files;
        }

        /*
        TODO: Reimplement as watcher class.
        if (updateFn) {
            this.lastRead[fromFolder] = files;
            this.createUpdateTimer(fromFolder, updateFn, updateInterval);
        }
        */

        return files;
    }

    /**
     * Removes a strategy.
     * @param {FileScannerStrategy}
     */
    static removeStrategy(type) {
        if (FileScanner.strategies[type]) {
            FileScanner.strategies[type] = false;
            delete FileScanner.strategies[type];
        }
    }

    /**
     * Whitelists folders to be included in file scan.  Changes strategy to
     * only allow folders in the whitelist.
     * @param {Array} folders The array of folders.
     */
    static whitelist(folders) {
        FileScanner.whitelisted = folders;
        FileScanner.addStrategy(FileScannerStrategy.WHITE_LIST);
    }
}

FileScanner.Cache = {};
FileScanner.filesCache = {objects: {}};
module.exports = FileScanner;