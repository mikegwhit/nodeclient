const chalk = require('chalk');
const Override = require(__dirname + '/override.class.js');
let FileHelpers;

/**
 * @class Provides helpers for overriding the require function.  This
 * includes requiring from child/parent modules and all new require calls.  
 * Virtualizes CommonJS packages.  Allows files to be specified that are not 
 * present in the filesystem.
 * @todo For security reasons, allow a sandboxed version of this code that 
 * destroys accessible references to the original require function.  This 
 * prevents the case whereby 'fs', 'http', and 'https' should be overridden 
 * without a way to access their defaults.
 */
class Require {
    /**
     * @returns {Object} Singleton to allow for initial require function storage.
     */
    constructor() {
        if (Require.instance) {
            return Require.instance;
        }
        FileHelpers = require('ncli-core-files/filehelpers.class.js');
        Require.instance = this;
        /**
         * @type {Object}
         * JavaScript files stored by the require token used to access it.
         */
        this.overrides = {};

        /**
         * @type {Object}
         * Redirection of one require token to another file or an override.
         */
        this.redirects = {};

        Require.__require = require;
        Require.cache = {};
        Require.loading = {};

        let parent = module.parent;

        this.requireOverrides = [];
        let _this = this;
        // Perform parent overrides.
        while (!!parent) {
            let _parent = parent;
            // If statement to prevent infinite recursion.
            if (parent.require['_' + parent.filename + module.filename]) {
                parent = parent.parent;
                continue;
            }
            parent.__require = parent.require['_' + parent.filename + module.filename] = parent.require;
            parent.require['override'] = Require;
            parent['override'] = {Require, Override};
            // TODO: Need to ensure require.resolve.paths 
            this.requireOverrides.push(new Override([_parent, 'require'], 
                function(oldRequire, file) {
                    return Require.instance.require(file, _parent);
                }, parent.require, require, parent.require));

            // Function to add the overrides to child modules.
            let children = (modules) => {
                if (!modules || modules.length == 0) {
                    return;
                }

                modules.map((child) => {
                    if (child.filename == module.filename ||
                        // If statement to prevent infinite recursion.
                        typeof child.require['_' + child.filename + module.filename] != 'undefined') {
                            return;
                        }
                    
                    let _child = child;
                    child.__require = child.require['_' + child.filename + module.filename] = child.require;
                    child.require['override'] = Require;
                    child['override'] = {Require, Override};
                    this.requireOverrides.push(new Override([_child, 'require'], 
                        function(oldRequire, file, parentModule) {
                            if (typeof parentModule == 'undefined') {
                                parentModule = _child;
                            }
                            return _this.require(file, parentModule);
                        }, child.require, child.require));
                    
                    children(child.children);
                });
            };
            children(parent.children);
            parent = parent.parent;
        }

        let _module = module;
        require['override'] = Require;
        /*
        module['override'] = {Require, Override};
        this.requireOverrideIndex = this.requireOverrides.push(new Override('require', 
            function(oldRequire, file) {
                console.log('no...', _module.filename);
                return _this.require(file, _module);
            }, require, require));

        let chainSize = this.requireOverrides[this.requireOverrideIndex - 1]
            .chain.length;
            
        require = this.requireOverrides[this.requireOverrideIndex - 1]
            .chain[chainSize - 1];
        */
    }

    /**
     * Used by tests to reset cache.
     */
    deleteCache(file) {
        let relativePath = false;
        if (Require.instance.isRelative(file)) {
            relativePath = true;
        }
        let cwdFile = Require.instance.normalize(process.cwd() + '/' + file);

        if (require.cache) {
            if (require.cache[file]) {
                delete require.cache[file];
            } else if (relativePath && require.cache[Require.instance.normalize(file)]) {
                delete require.cache[Require.instance.normalize(file)];
            } else if (cwdFile && require.cache[cwdFile]) {
                delete require.cache[cwdFile];
            }
        }
        if (Require.cache[file]) {
            delete Require.cache[file];
        }
    }

    /**
     * Gets the requested file from the cache, given the require object.
     * @param {String} file The file to attempt to retrieve.
     * @param {Object} module The object.
     * @returns {Object} The module.
     */
    getCache(file, module) { 
        let relativePath = false;
        if (Require.instance.isRelative(file)) {
            relativePath = true;
        }
        let cwdFile = Require.instance.normalize(process.cwd() + '/' + file);

        if (Require.cache[file]) {
            return Require.cache[file];
        } else if (require.cache && require.cache[file]) {
            return require.cache[file];
        } /* else if (module && module.require && module.require.cache && module.require.cache[file]) {
            return module.require.cache[file];
        } */ else if (relativePath && require.cache && require.cache[Require.instance.normalize(file)]) {
            return require.cache[Require.instance.normalize(file)];
        } /* else if (module && module.require && module.require.cache && relativePath && module.require.cache[Require.instance.normalize(file)]) {
            return module.require.cache[Require.instance.normalize(file)];
        } */ else if (cwdFile && require.cache && require.cache[cwdFile]) {
            return require.cache[cwdFile];
        } /* else if (module && module.require && module.require.cache && cwdFile && module.require.cache[cwdFile]) {
            return module.require.cache[cwdFile];
        } */

        return false;
    }

    /**
     * Resolves a redirect as the redirect or the override.  If no redirect
     * or override is found, then returns the string as-is.
     * @returns {String} The resolved require string token or the overridden 
     * file contents.
     */
    getRedirect(file) {
        let relativePath = false;
        if (Require.instance.isRelative(file)) {
            relativePath = true;
        }
        let cwdFile = Require.instance.isCwd(file);
        if (Require.instance.overrides.hasOwnProperty(file)) {
            return file;
        }
        if (relativePath && Require.instance.overrides.hasOwnProperty(Require.instance.normalize(file))) {
            return Require.instance.normalize(file);
        }
        if (cwdFile && Require.instance.overrides.hasOwnProperty(cwdFile)) {
            return cwdFile;
        }
        if (Require.instance.redirects.hasOwnProperty(Require.instance.normalize(file))) {
            return Require.instance
                .getRedirect(Require.instance
                .redirects[Require.instance.normalize(file)]);
        }
        if (relativePath && Require.instance.redirects.hasOwnProperty(file)) {
            return Require.instance.getRedirect(Require.instance.redirects[file]);
        }
        if (cwdFile && Require.instance.redirects.hasOwnProperty(cwdFile)) {
            return Require.instance.getRedirect(Require.instance.redirects[cwdFile]);
        }
        if (!arguments[1]) {
            return Require.instance.getRedirect(Require.instance.normalize(file), true);
        }
    }

    /**
     * Checks if the specified file has an override.
     * @param {String} file The file to check.
     * @returns {Boolean}
     */
    hasOverride(file) {
        let relativePath = false;
        if (Require.instance.isRelative(file)) {
            relativePath = true;
        }
        let cwdFile = Require.instance.normalize(process.cwd() + '/' + file);

        return (Require.instance.overrides.hasOwnProperty(Require.instance.normalize(file)) || 
            Require.instance.overrides.hasOwnProperty(cwdFile) ||
            Require.instance.overrides.hasOwnProperty(Require.instance.normalize(cwdFile)) ||
            (relativePath && Require.instance.overrides.hasOwnProperty(file))) || 
            (Require.instance.hasRedirect(file));
    }

    /**
     * @returns {Boolean} True if there's a redirect.
     */
    hasRedirect(file) {
        let relativePath = false;
        if (Require.instance.isRelative(file)) {
            relativePath = true;
        }
        let cwdFile = Require.instance.normalize(process.cwd() + '/' + file);

        return (Require.instance.redirects.hasOwnProperty(Require.instance.normalize(file))) ||
            (relativePath && Require.instance.redirects.hasOwnProperty(cwdFile)) ||
            (relativePath && Require.instance.redirects.hasOwnProperty(Require.instance.normalize(cwdFile))) ||
            (relativePath && Require.instance.redirects.hasOwnProperty(file));
    }

    /**
     * @todo This function seems to be incorrectly labeled.  It returns a filename for overrides/redirects only.
     * @returns {Boolean|String} False if not part of CWD, else returns absolute
     * path.
     */
    isCwd(file) {
        file = Require.instance.normalize(process.cwd() + '/' + file);
        if (Require.instance.hasRedirect(file) ||
            Require.instance.hasOverride(file)) {
                return file;
            }
        return false;
    }

    /**
     * Function used to check incoming require requests.
     * @param {String} file The filename to check.
     * @returns {Boolean} True if the path is relative.
     */
    isRelative(file) {
        return Require.instance.normalize(file).substr(0, 
            Require.instance.normalize(process.cwd()).length) == Require.instance.normalize(process.cwd());
    }

    /**
     * Updates the paths of the module after resolution.  
     */
    modifyPaths(module) {
        let newPaths = [];
        let thisFile = this.normalize(module.filename);
        let path = '';
        let pathParts = thisFile.split('/');
        pathParts.pop();
        pathParts.map((part) => {
            path += part + '/';
            if (part != 'node_modules' && newPaths.indexOf(path + 'node_modules') == -1) {
                newPaths.push(path + 'node_modules');
            }
        });
        
        newPaths.reverse();

        // @todo Why was this commented out?
        /*
        module.paths.map((path, idx) => {
            let thatFile = this.normalize(path);
            thatFile = thatFile.split('/');
            thatFile.pop();
            thatFile = thatFile.join('/');
            if (newPaths.indexOf(thatFile + '/') == -1) {
                newPaths.unshift(thatFile + '/');
            }
        });
        */

        module.paths = newPaths;
    }

    /**
     * Instantiates a new module.
     * @param {Module} from The module from which to instantiate.
     * @param {String} file The filename.
     * @returns {Module} A quasi Module object.
     */
    newModule(from, file) {
        const module = Object.assign({}, from);
        module.parent = from;
        module['override'] = Require;
        module.exports = {};
        module.filename = file;
        module.id = file;
        module.loaded = false;
        try {from.children.push(module);} catch(e) {}
        return module;
    }

    /**
     * Normalizes the file name.
     */
    normalize(file) {
        return Require.__require('path').resolve(file).replace(/\\\\/g, '/').
            replace(/\\/g, '/');
    }

    /**
     * Overrides the function with contents to be wrapped and execute in a 
     * CommonJS module context.  It's important to note that the only paths
     * stored as overrides are absolute paths.  Synonyms are created as a 
     * redirect.
     * @param {String} file The file to override.  If is relative path, is 
     * resolved as abs path.
     * @param {String} contents The contents of the file.
     * @param {Boolean} isPackagePath If true, then resolves the pathname as 
     * part of the most relevant node_modules folder.  This would make the 
     * override similar as though the file specified is a package.  If true
     * this preserves the original file specified as a redirect, just as a 
     * node_modules package can be required with the package name token.
     */
    override(file, contents, isPackagePath = false) {
        var __file = file;
        if (!isPackagePath) {
            file = Require.instance.normalize(file);
        } else {
            file = Require.instance.normalize(FileHelpers
                .getMainDirectory() + '/node_modules/' + file);
        }
        
        Require.instance.overrides[file] = eval(`
(function(exports, require, module, __filename, __dirname) {
${contents}
});
`);
        if (isPackagePath) {
            Require.instance.redirect(__file, file, true);
        }
    }

    /**
     * Redirects a require call to another redirect, override or real file.
     * @param {String} from The source require call to override.
     * @param {String} to The file to redirect to.
     * @param {Boolean} isPackagePath If true, adds an additional redirect 
     * for the node_modules folder.
     * @todo The isPackagePath code path might create a redundancy if override
     * already exists.
     */
    redirect(from, to, isPackagePath = false) {
        var __from = from;
        if (!isPackagePath) {
            from = Require.instance.normalize(from);
        } else {
            from = Require.instance.normalize(FileHelpers
                .getMainDirectory() + '/node_modules/' + from);
        }
        Require.instance.redirects[from] = to;
        Require.instance.redirects[__from] = from;
    }

    /**
     * Overriden require function.  Receives additional parameter of the old 
     * require function as a fallback as well as the module object.
     * @param {String} file The file to require.
     * @param {Module} parentModule The parent module.  Used to instantiate the 
     * new module object.  This preserves the parent module chain.
     * @returns {Object} The exports object.
     */
    require(file, parentModule) {
        if (Require.instance.hasRedirect(file)) {
            file = Require.instance.getRedirect(file);
        }

        // Load from cache, if available.
        let fromCache = Require.instance.getCache(file, parentModule);
        if (fromCache) {
            return fromCache.exports;
        }

        if (!Require.instance.hasOverride(file)) {
            exports = Require.instance.requireWithoutOverride(file, parentModule);
        } else {
            file = Require.instance.getRedirect(file);
            exports = Require.instance.requireWithOverride(file, parentModule);
        }

        return exports;
    }

    /**
     * Requires a file given a specified override.  The override itself 
     * specifies the content of the file to load.
     * @param {String} file The file to require.
     * @param {Module} parentModule The parent module.  Used to instantiate the 
     * new module object.
     */
    requireWithOverride(file, parentModule) {
        let module = Require.instance.newModule(parentModule, file);
        let exports = module.exports;
        let files = Require.instance.overrides;
        let __require = Object.assign(function() {
            return function(file) {
                return Require.instance.require(file, module);
            }.bind(this);
        }.bind(require)(), require);

        if (Require.loading[file]) {
            return Require.loading[file];
        }
        Require.loading[file] = module.exports;

        if (files[Require.instance.normalize(file)]) {
            files[Require.instance.normalize(file)](exports, __require, 
                module, file, Require.__require('path').dirname(file));
            Require.instance.setCache(Require.instance.normalize(file), 
                module.exports, module);
        } else {
            files[file](exports, __require, 
                module, __dirname + '/' + file.split('/').pop(), 
                file.split('/').pop());
            Require.instance.setCache(file, module.exports, module);
        }

        module.loaded = true;
        Require.loading[file] = false;
        return module.exports;
    }

    /**
     * Requires without the override.  Attempts to use the custom require
     * function, and if that does not work falls back to the native require.
     */
    requireWithoutOverride(file, parentModule) {
        let module = Require.instance.newModule(parentModule, file);
        let exports = module.exports;
        let files = Require.instance.overrides;
        try {
            // Utilize the module paths and module resolution.
            file = require.resolve(file, {paths: module.paths});
        } catch(e) {
            // Module resolution failed.  Uh oh...
            if (file.startsWith('./')) {
                file = file.substr(2); // Attempts to treat this as CWD.
                // TODO: Also interpret ./ as ES5 require path (i.e. relative to closest package.json)
            }
            let path = Require.__require('path').dirname(parentModule
                .filename) + '/' + file;
            if (Require.__require('fs').existsSync(path)) {
                // It's doable to assume .js as extension.
                file = path;
            } else if (Require.__require('fs').existsSync(path + '.js')) {
                // So .js sometimes needs to get checked explicitly.
                file = path + '.js';
            } 
        }

        if (!Require.__require('fs').existsSync(file)) {
            // Can't find anything in filesystem, give up and fallback.
            exports = Require.instance.requireNative(file, module);
            return exports;
        }

        // Module resolution somehow succeeded.  Modify module paths to reflect.
        module.filename = file;
        this.modifyPaths(module);

        let contents = '';

        // Attempt to grab cache one last time with resolved filename.
        let fromCache = Require.instance.getCache(file, parentModule);
        if (fromCache) {
            return fromCache.exports;
        }
        
        // Non-native files are always resolvable.
        contents = Require.__require('fs').readFileSync(file, 'utf8');
        contents = `(function(exports, require, module, __filename, __dirname) {
${contents}
});`;
        // Evaluate the file contents and store it.
        Require.instance.overrides[file] = eval(contents);
        // Attempt the execute the module with a custom values.
        let path = Require.instance.requireNative('path', module);
        let __require = Object.assign(function() {
            return function(file) {
                return Require.instance.require(file, module);
            }.bind(this);
        }.bind(module.require)(), require, module.require);
        if (Require.loading[file]) {
            return Require.loading[file];
        }
        Require.loading[file] = module.exports;
        try {
            Require.instance.overrides[file](exports, __require, 
                module, file, path.dirname(file));
        } catch(e) {
            exports = Require.instance.requireNative(file, module);
            return exports;
        }
        module.loaded = true;
        Require.loading[file] = false;
        Require.instance.setCache(file, module.exports, module);
        return module.exports;
    }

    /**
     * Requires using the native require function.
     */
    requireNative(file, module) {
        let exports = {};
        // Store the previous variables before calling as native.
        let __require = require;
        require = Require.__require;
        exports = require(file);
        require = __require;
        return exports;
    }

    /**
     * Restores the original require function.
     */
    release() {
        this.requireOverrides.map((override) => {
            override.release();
        });
        require = Require.__require;
        let parent = module.parent;
        while (!!parent) {
            if (!parent.require) {
                parent.require = parent.require['_' + parent.filename + module.filename];
                parent.require['_' + parent.filename + module.filename] = false;
                delete parent['override'];
            }
            
            let children = (modules) => {
                if (!modules || modules.length == 0) {
                    return;
                }
                modules.map((child) => {
                    if (!child.require['_' + child.filename + module.filename]) { 
                        return;
                    }
                    child.require = child.require['_' + child.filename + module.filename];
                    child.require['_' + child.filename + module.filename] = false;
                    delete child['override'];
                    children(child.children);
                });
            };
            children(parent.children);
            parent = parent.parent;
        }
        delete require['override'];
    }

    /**
     * Sets the cache item.
     */
    setCache(file, contents, module) {
        if (!!require) {
            if (!require.cache) {
                require.cache = {};
            }
            require.cache[file] = module;
        }
        if (!!module.require) {
            if (!module.require.cache) {
                module.require.cache = {};
            }
            module.require.cache[file] = module;
        }
        Require.cache[file] = module;
        /*
        if (Require.__require('fs').existsSync(Require.instance.normalize(file))) {
            require.cache[Require.instance.normalize(file)] = contents;
        }
        if (Require.__require('fs').existsSync(Require.instance.normalize(file).replace(/\//g, '\\\\'))) {
            require.cache[Require.instance.normalize(file).replace(/\//g, '\\\\')] = contents;
        }
        */
    }
}

module.exports = Require;