/**
 * Helpers container class for Node.js filesystem.  Includes finding first 
 * non-node_modules folder, the original executed file, the current functions
 * parent file, all packages in a directory, resolving packageName/file paths.
 */
class FileHelpers {
    /**
     * Finds the packages given a directory.
     * @param {String} from (Optional) If provided, the root directory from 
     * which to search.  Else, uses process.cwd().
     * @param {Boolean} cache If true, caches the results and returns from cache
     * if cache hits.
     * @return {Object} An object of package directories, keyed by package name.
     */
    static findPackageNames(from = '', cache = false) {
        return FileHelpers.findPackageDirectories(from, cache).reduce((obj, dir) => {
            try {
                const name = 
                    JSON.parse(require('fs').readFileSync(dir + 
                    '/package.json'))['name'];
                obj[name] = dir;
            } catch(e) {
            }
            return obj;
        }, {});
    }

    /**
     * Given some root directory, finds all package.json files outside of 
     * node_modules paths.
     * @param {String} from (Optional) If provided, the root directory from 
     * which to search.  Else, uses process.cwd().
     * @param {Boolean} cache If true, caches the results and returns from cache
     * if cache hits.
     * @param {Boolean} ignoreNodeModules Ignores the node_modules packages.  
     * Setting this to true might take a really long time!
     * @return {Array} An array of package directories.
     */
    static findPackageDirectories(from = '', cache = false, ignoreNodeModules = true) {
        return FileHelpers.findPackages(from, cache, ignoreNodeModules).map((aPackage) => {
            return aPackage.split('/').slice(0, -1).join('/');
        });
    }
    
    /**
     * Given some root directory, finds all package.json files outside of 
     * node_modules paths.
     * @param {String} from (Optional) If provided, the root directory from 
     * which to search.  Else, uses process.cwd().
     * @param {Boolean} cache If true, caches the results and returns from cache
     * if cache hits.
     * @param {Boolean} ignoreNodeModules Ignores the node_modules packages.  
     * Setting this to true might take a really long time!
     */
    static findPackages(from = '', cache = false, ignoreNodeModules = true) {
        if (from.length == 0) {
            from = FileHelpers.normalize(process.cwd());
        }

        if (cache && FileHelpers.packageCache && FileHelpers.packageCache[from]) {
            return FileHelpers.packageCache[from];
        }

        if (FileHelpers.Cache.set) {
            let obj = FileHelpers.Cache.get('localPackages');
            if (!obj) {
                obj = {};
                FileHelpers.Cache.set('localPackages', obj, {
                    persist: false
                });
            }
            if (obj.hasOwnProperty(from)) {
                return obj[from];
            }
        }

        let filterObj = {};
        if (ignoreNodeModules) {
            filterObj = {
                pattern: /(^node_modules\/)|(\/node_modules\/)|(\/packages\/)/g,
                exclude: true
            };
        }
        
        /*
        if (FileHelpers.strategies[FileHelpers.strategyTypes.BLACK_LIST]) {
            if (ignoreNodeModules) {
                fileObj['pattern'] = 
                    new RegExp(`(\/node_modules\/)|(${FileHelpers
                        .blacklisted.join(')|(')})`, 'g');
            } else {
                filterObj = {
                    pattern: new RegExp(`(${FileHelpers
                        .blacklisted.join(')|(')})`, 'g'),
                    exclude: true
                };
            }
        }
        */
        const files = require('ncli-core-rscandir')(from, filterObj);

        const packages = files.filter((file) => {
            const dir = file.split('/').slice(0, -1).join('/');
            if (file.split('/').slice(-1) == 'package.json' &&
                dir != from.substr(-dir.length) &&
                dir != '.') {
                return true;
            }
            return false;
        });

        if (cache) {
            if (!FileHelpers.packageCache) {
                FileHelpers.packageCache = {};
            }
            FileHelpers.packageCache[from] = packages;
        }

        if (FileHelpers.Cache.set) {
            let obj = FileHelpers.Cache.get('localPackages');
            if (!obj) {
                obj = {};
                FileHelpers.Cache.set('localPackages', obj, {
                    persist: false
                });
            }
            obj[FileHelpers.normalize(from)] = packages.map((pkg) => {
                return FileHelpers.normalize(pkg);
            });
            
            FileHelpers.Cache.set('localPackages', obj, {
                persist: false
            });
        }
        return packages;
    }

    /**
     * Gets the most relevant application directory.  This is defined by taking
     * the currently executing file folder, and checking or moving up until the
     * directory is no longer inside a node_modules folder.
     * @param {String} from (Optional) If provided, attempts to lookup from the
     * from directory.
     * @return {string} The most relevant application directory.
     */
    static getApplicationDirectory(from = '') {
        let path;
        if (!from.length) {
            from = process.cwd();
        }
        from = require('path').resolve(from);
        if (!require('fs').statSync(from).isDirectory()) {
            path = require('path').dirname(from);
        } else {
            path = from;
        }
        path = FileHelpers.normalize(path);
        while (path.includes('node_modules')) {
            path = path.split('/').slice(0, -1).join('/');
        }
        return FileHelpers.normalize(path);
    }
    
    /**
     * Gets the caller function's filename.  Assumes called function is one 
     * function above Console.getCallerFile function.
     * @author http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
     * @return {String} The called function filename.
     */
    static getCallerFile(idx = -1) {
        if (!idx || idx == -1) {
            idx = 0;
        }
        idx += 2;
        return (FileHelpers.getCallerFiles())[idx];
    }

    /**
     * Gets the caller function's filename.  Assumes called function is one 
     * function above Console.getCallerFile function.
     * @author http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
     * @return {Array} The callstack.
     */
    static getCallerFiles() {
        let stacktrace = require('stack-trace');
        const files = [];
        stacktrace.get().map((file) => {
            try {
                if (file.isNative() || ((require('path').basename(file.getFileName()) == 'module.js' ||
                    require('path').basename(file.getFileName()) == 'timers.js') &&
                    (require('path').dirname(file.getFileName()) == '.' || 
                    require('path').dirname(file.getFileName()) == 'internal' ||
                    require('path').dirname(file.getFileName()).endsWidth('process')))) {
                } else {
                    files.push(FileHelpers.normalize(file.getFileName()));
                }
            } catch(e) {
                
            }
        });
        return files;
    }

    /**
     * Gets a file by resolving a packageName/path format and ensuring
     * the current working directory is at the 'package.json' root.  This allows
     * for files to be gotten from their most relevant path and also allows for
     * path reuse even when a file is available as a package only (via
     * node_modules).
     * @param {String} file The package file to get.
     * @returns {Boolean|String} The filepath or false if no file found.
     */
    static getFile(file) {
        const cwd = process.cwd();
        let path = false;
        process.chdir(FileHelpers.getApplicationDirectory(process.cwd()));
        const packageName = file.split('/')[0];
        const filename = file.split('/').slice(1).join('/');
        if (FileHelpers.getPackageName(process.cwd()) == packageName && 
            require('fs').existsSync(file.split('/').slice(1).join('/'))) {
            // Found in path with packagename stripped.
            path = process.cwd() + '/' + file.split('/').slice(1).join('/');
        } else if (require('fs').existsSync('node_modules') && 
            require('fs').existsSync('node_modules/' + packageName) && 
            require('fs').existsSync('node_modules/' + packageName + '/' +
            filename)) {
            // Found in node_modules/packagename/path
            path = process.cwd() + '/' + 'node_modules/' + packageName + '/' +
                file.split('/').slice(1).join('/');
        } else {
            // TODO: Add support for found packages.
            const packages = FileHelpers.findPackageNames(cwd, true);
            if (packages[packageName] && 
                require('fs').existsSync(packages[packageName] + '/' + 
                filename)) {
                path = packages[packageName] + '/' + filename;
            }
        }
        process.chdir(cwd);
        
        if (!path) {
            return path;
        }

        return FileHelpers.normalize(path);
    }

    /**
     * Heuristic for guessing main directory.  This includes resolving the 
     * following use cases: 
     *   1) ./node_modules/.bin scripts
     *   2) ./node_modules/PACKAGE_NAME/file scripts
     *   3) ./SUBDIR/file calls
     * 
     * The first non-node_modules folder with a package.json in it is used.
     */
    static getMainDirectory() {
        return FileHelpers.normalize(FileHelpers.getPackageDirectory(
            FileHelpers.getApplicationDirectory()));
    }

    /**
     * Gets all node_modules packages.
     * @param {Function} progress (Optional) If provided, is pinged when each
     * package is scanned.
     */
    static getNodeModulePackages(path, noDepth = false, progress = false, recursion = false) {
        let packages = [];
        const curPath = path + '/node_modules';
        if (!recursion && FileHelpers.Cache.set && FileHelpers.Cache.has('packages')) {
            let obj = FileHelpers.Cache.get('packages');
            if (obj && typeof obj == 'object' && obj.hasOwnProperty(curPath)) {
                return obj[curPath];
            }
        } else if (!recursion && !FileHelpers.Cache.set) {
            if (FileHelpers.packagesCache.objects[curPath]) {
                return FileHelpers.packagesCache.objects[curPath];
            }
        }
        
        if (!recursion && !noDepth) {
            console.info('Scanning packages, this may take a moment...');
        }
        let directories = [];
        if (require('fs').existsSync(curPath)) {
            directories = packages.concat(require('fs').readdirSync(curPath));
            packages = directories.reduce((packages, dir, idx) => {
                try {
                    if (require('fs').existsSync(`${curPath}/${dir}/package.json`)) {
                        let pkg = FileHelpers.normalize(`${curPath}/${dir}`);
                        let pkgName = JSON.parse(require('fs')
                            .readFileSync(`${pkg}/package.json`, 'utf8'));
                        if (progress) {
                            progress(idx, directories.length, pkgName['name']);
                        }
                        packages.push(pkg);
                        if (!noDepth) {
                            packages = packages.concat(FileHelpers
                                .findPackageDirectories(pkg, true, false));
                            packages = packages.concat(FileHelpers
                                .getNodeModulePackages(pkg, true, null, true));
                        }
                    }
                } catch(e) {
                    if (progress) {
                        progress(idx + 1, directories.length, dir);
                    }
                }
                return packages;
            }, []);
        }
        if (!recursion && FileHelpers.Cache.set) {
            let obj = FileHelpers.Cache.get('packages');
            if (!obj) {
                obj = {};
            }
            obj[FileHelpers.normalize(curPath)] = packages.map((pkg) => {
                return FileHelpers.normalize(pkg);
            });
            FileHelpers.Cache.set('packages', obj, {
                persist: true
            });
        } else if (!recursion && !FileHelpers.Cache.set) {
            FileHelpers.packagesCache.objects[FileHelpers.normalize(curPath)] = packages.map((pkg) => {
                return FileHelpers.normalize(pkg);
            });
        }
        if (progress) {
            progress(directories.length, directories.length, '');
        }
        return packages;
    }

    /**
     * Gets the directory of a package.
     */
    static getPackageDirectory(path) {
        return FileHelpers.getPackageFile(path).split('/').slice(0, -1).join('/');
    }

    /**
     * Gets the package.json given a file path.  If not found in the filepath 
     * directory, moves up a directory.
     * @param {String} file The file path to search from.
     * @return {Boolean|String} False if no file is found.
     */
    static getPackageFile(path) {
        if (!path) {
            path = process.cwd();
        }
        if (!require('fs').existsSync(path)) {
            return '';
        }

        try {
            path = FileHelpers.normalize(path);
        } catch(e) {
            try {
                if (require('fs').existsSync(process.cwd() + '/' + path)) {
                    path = FileHelpers.normalize(process.cwd() + '/' + path);
                }
            } catch(e) {
                return '';
            }
        }

        if (!require('fs').statSync(path).isDirectory()) {
            path = require('path').dirname(path);
        }
        while (!require('fs').existsSync(path + '/package.json') && 
            path.length > 0 && path.split('/')[0].length > 0) {
            path = path.split('/').slice(0, -1).join('/');
        }
        if (require('fs').existsSync(path + '/package.json')) {
            return path + '/package.json';
        } else {
            return '';
        }
    }

    /**
     * Gets the package.json name key given a file path.  If not found in the
     * filepath directory, moves up a directory.
     * @param {String} file The file path to search from.
     * @return {Boolean|String} Name of most relevant package or false if no 
     * file found or malformed JSON.
     */
    static getPackageName(file) {
        const packageFile = FileHelpers.getPackageFile(file);
        if (packageFile) {
            try {
                return JSON.parse(require('fs').readFileSync(packageFile, 
                    'utf8'))['name'];
            } catch(e) {
                return false;
            }
        }
        return false;
    }
    
    /**
     * Gets all the packages directories given a path input.  This includes
     * direct subfolders of node_modules (if it exists) and all folders with
     * package.json in it.
     * @param {String} path If provided, concatenates to process.cwd().
     */
    static getPackageNames(path = '') {
        return FileHelpers.getPackages(path).reduce((packages, dir) => {
            try {
                const name = FileHelpers.getPackageObject(dir)['name'];
                packages[name] = FileHelpers.normalize(dir);
            } catch(e) {
            }
            return packages;
        }, {});
    }

    /**
     * Gets the package.json object key given a file path.  If not found in the
     * filepath directory, moves up a directory.
     * @param {String} file The file path to search from.
     * @return {Object} Object of most relevant package or false if no 
     * file found or malformed JSON.
     */
    static getPackageObject(file) {
        if (FileHelpers.Cache.set && FileHelpers.Cache.has('packageObjects')) {
            let obj = FileHelpers.Cache.get('packageObjects');
            if (obj[file]) {
                return obj[file];
            }
        }
        const packageFile = FileHelpers.getPackageFile(file);
        if (packageFile) {
            try {
                let packageObj = JSON.parse(require('fs').readFileSync(packageFile, 
                    'utf8'));
                if (FileHelpers.Cache.set) {
                    let obj = FileHelpers.Cache.get('packageObjects');
                    if (!obj) {
                        obj = {};
                    }
                    obj[file] = packageObj;
                    FileHelpers.Cache.set('packageObjects', obj, {
                        persist: true
                    });
                }
                return packageObj;
            } catch(e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Gets all the packages directories given a path input.  This includes
     * direct subfolders of node_modules (if it exists) and all folders with
     * package.json in it.
     * @param {String} path If provided, concatenates to process.cwd().
     * @param {Boolean} noDepth If true, does not recursively scan node_modules
     * folders within node_modules folders.
     */
    static getPackages(path = '', noDepth = false, skipLocalPackages = false) {
        let packages = [];
        path = FileHelpers.normalize(path);
        if (path.substr(1) == '/') {
            path = '.' + path;
        }
        
        packages = FileHelpers.getNodeModulePackages(path, noDepth);
        
        if (!path.includes('node_modules') && !skipLocalPackages) {
            packages = packages.concat(FileHelpers.findPackageDirectories(path));
        }

        return packages;
    }

    /**
     * Gets the currently executing Node Script's directory.
     * @return {string} The current process target directory.
     */
    static getProcessDirectory() {
        return require('path').dirname(require.main.filename);
    }

    /**
     * Normalize a pathname.
     */
    static normalize(path, mustExist = true) {
        return require('path').resolve(path).replace(/\\/g, '/');
    }

    /**
     * Called when the cache saves.
     * @todo This is very similar to filescanner.class.js implementation. Should de-dupe the code.
     */
    static onSaveCache(key, val) {
        if (key == 'packages') {
            const cache = FileHelpers.Cache.objects[key];
            const cacheCopy = Object.assign({}, FileHelpers.Cache.objects[key]);
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
                    cache.value[path].map((path) => {
                        let dependencyChain = path.split('/node_modules');
                        let leafPackage = dependencyChain.pop();
                        let cachePath = dependencyChain.join('/node_modules');
                        let realPath = 
                            FileHelpers.normalize(require('fs').realpathSync(FileHelpers.normalize(cachePath)));
                        return realPath + '/node_modules' + leafPackage;
                    });
            }
            for (let key in keys) {
                keys[key].length = JSON.stringify(keys[key].value).length;
                let cache = keys[key];
                let folder = '.cache/';
                if (FileHelpers.Cache.configs['cache']) {
                    folder = FileHelpers.Cache.configs['cache']['folder'] + '/';
                }
                let file = key + '/' + folder + cache.prefix + cache.key + 
                    '.json';
                FileHelpers.Cache.files.writeFile(file, JSON.stringify(cache, null, 2), true, 'utf8');
            }
        }
    }

    /**
     * Recursively removes the directory specified.
     * @param  {string} directory Directory to remove.
     */
    static rrmdir(directory) {
        require('rimraf').sync(directory);
    }

    /**
     * Changes a path into a filename.
     * @param {String} path A filepath.
     * @todo Consider removal (used by quality/tests).
     * @returns {String} The filename.
     */
    static toFilename(path) {
        path = path.replace(/\\/g, '/');
        let directories = path.split('/');
        return directories.pop();
    }

    /**
     * Changes an array of paths to an array of filenames.
     * @param {Array} paths An array of paths.
     * @todo Consider removal (used by quality/tests).
     * @returns {Array} An array of filenames.
     */
    static toFilenames(paths) {
        if (typeof paths == 'string') {
            paths = [paths];
        }
        for (let idx in paths) {
            paths[idx] = Files.toFilename(paths[idx]);
        }
        
        return paths;
    }
}
FileHelpers.strategies = {};
FileHelpers.packagesCache = {objects: {}};
FileHelpers.Cache = {};
module.exports = FileHelpers;