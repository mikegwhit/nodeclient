/**
 * Handling for the in-memory and filesystem cache.  Primary use cases are for 
 * large filsystem reads and for rscandir.
 * @class
 */
class Cache {
    /**
     * 
     * @param {String} key 
     * @param {*} val 
     * @param {Object} options 
     */
    constructor(key, val, options = {}) {
        /**
         * If true, only stored in memory (never written to disk).
         * @type {Boolean}
         */
        this.inMemory = Cache.configs['cache'] ? Cache.configs['cache'].inMemory : true;

        /**
         * The key.
         */
        this.key = key;
        
        /**
         * This is the time the cache was last updated with a value.
         * @type {Date}
         */
        this.lastModified = (new Date()).getTime();

        /**
         * If provided, is the file prefix when saving the cache.  Can be mix of
         * directory and filename.
         * @type {String}
         */
        this.prefix = '';

        /**
         * This is the time the cache was created.
         * @type {Date}
         */
        this.startTime = (new Date()).getTime();

        /**
         * This is the value of the cache.
         * @type {*}
         */
        this.value = null;

        /**
         * If true, stores to disk before the process exits.  Else erases.
         * @type {Boolean}
         */
        this.persist = Cache.configs['cache'] ? Cache.configs['cache'].persist : true;

        Object.assign(this, options);
        Cache.objects[key] = this;
    }

    /**
     * Clears the cache from memory and optionally the filesystem.
     * @param {Boolean} andRemoveFiles If true, removes cache files from the
     * filesystem as well.
     */
    static clear(filterKey, andRemoveFiles = false) {
        Object.keys(Cache.objects).map((key) => {
            if (filterKey && filterKey != key) {
                return;
            }
            if (andRemoveFiles) {
                Cache.remove(key);
            }
            delete Cache.objects[key];
        });
    }

    /**
     * Gets the cache file for a key.
     * @param {String} key The key to retrieve file for.
     */
    static file(key) {
        if (!Cache.has(key)) {
            return false;
        }

        let folder = '.cache/';
        if (Cache.configs['cache']) {
            folder = Cache.configs['cache']['folder'] + '/';
        }
        let obj = Cache.objects[key];
        return Files.getMainDirectory() + '/' + folder + obj.prefix + obj.key + 
            '.json';
    }

    /**
     * Reads a set of files from the cache.
     * @param  {String} key The key to look for.
     * @return {*} The value stored in the cache key if it exists.  Otherwise,
     * null is returned.
     */
    static get(key) {
        if (!Cache.has(key)) {
            return null;
        }
        if (!Cache.objects[key].inMemory) {
            return Cache.read(key).value;
        }
        return Cache.objects[key].value;
    }

    /**
     * Reads a set of files from the cache.
     * @param  {String} key The key to look for.
     * @return {*} The value stored in the cache key if it exists.  Otherwise,
     * null is returned.
     */
    static getObject(key) {
        return Cache.objects[key];
    }

    /**
     * @param {String} key The key to lookup.
     * @returns {Boolean} True if the key exists.
     */
    static has(key) {
        return Cache.objects.hasOwnProperty(key);
    }

    /**
     * Invalidates the cache, 
     */
    static invalidate() {
        Object.keys(Cache.objects).map((key) => {
            const obj = Cache.objects[key];
            if (!obj.inMemory) {
                Cache.save(key, true, true);
            }
        });

        const size = Object.keys(Cache.objects).reduce((size, key) => {
            const obj = Cache.objects[key];
            size += obj.length;
            return size;
        }, 0);
        let delta = 0;
        let memThreshold = Cache.configs['cache'] ? Cache.configs['cache']['memoryThreshold'] : 5000000;
        // Send all oversized keys to the filesystem.
        let oversizedKeys = Object.keys(Cache.objects).reduce((oversized, key) => {
            const len = Cache.objects[key].length;
            if (len > memThreshold) {
                oversized.push(key);
            }
            return oversized;
        }, []);

        oversizedKeys.map((key) => {
            delta += Cache.objects[key].length;
            Cache.save(key, true);
        });

        // Delete keys until threshold is manageable.
        while (size - delta > memThreshold) {
            // Begin saving the cache.
            let oldestCache = (new Date).getTime();
            let oldestIdx = Object.keys(Cache.objects).length;
            let oldestKey = Object.keys(Cache.objects).reduce((oldest, key, idx) => {
                const obj = Cache.objects[key];
                if (obj.lastModified <= oldestCache && idx < oldestIdx && 
                    obj.value != null) {
                        oldestCache = obj.lastModified;
                        oldestIdx = idx;
                        return key;
                    }
                return oldest;
            }, '');
            delta += Cache.objects[oldestKey].length;
            Cache.save(oldestKey, true);
        }
    }

    /**
     * Allow the addition of a callback such that callback is called with the 
     * key being saved and the value.
     */
    static onSave(callback) {
        Cache.onSaveCallbacks.push(callback);
    }

    /**
     * When the system shuts down, all cache files shall be re-saved to the 
     * filesystem.
     */
    static onShutdown() {
        Cache.save();
        Cache.temporary.map((key) => {
            Cache.remove(key);
        });
    }
    
    /**
     * Sets the options of the key.
     * @param {String} key The key to lookup.
     * @param {Object} obj The options for this cache.
     */
    static options(key, obj) {
        if (Cache.has(key)) {
            Object.assign(Cache.objects[key], obj);
        }
    }

    /**
     * Reads the cache from the filesystem.
     * @param {String} key The key to read.
     * @returns {*} The result of calling a get on the key.
     */
    static read(key = null, overwrite = false) {
        let folder = '.cache/';
        if (Cache.configs['cache']) {
            folder = Cache.configs['cache']['folder'] + '/';
        }

        const files = Files.readLocalFiles(Cache.configs['cache'].folder);
        let cache = null;
        if (!key && files.length) {
            console.info('Reading local cache.');
        }
        files.map((file) => {
            let obj = JSON.parse(require('fs').readFileSync(file, 'utf8'));
            if ((key && overwrite) || !key) {
                new Cache(obj.key, obj.value, obj);
            }
            if (key && key == obj.key) {
                cache = obj;
            }
            if (!obj.inMemory) {
                Cache.objects[obj.key].value = null;
            }
        });
        if (key) {
            return cache;
        }
    }

    /**
     * Removes from filesystem if exists.
     */
    static remove(key) {
        if (!Cache.has(key)) {
            return;
        }
        let obj = Cache.objects[key];
        const filename = Cache.file(key);
        if (require('fs').existsSync(filename)) {
            require('fs').unlinkSync(filename);
        }
    }

    /**
     * Saves the current cache to the filesystem.
     * @param {String} filterKey (Optional) The key to save.  If provided, only
     * the filterKey is saved.
     * @param {Boolean} removeFromMemory If true, removes the cache from memory.
     */
    static save(filterKey = null, removeFromMemory = false, 
        overridePersist = false, objects = null) {
            if (!objects) {
                objects = Cache.objects;
            }
            Object.keys(objects).map((key) => {
                const obj = objects[key];
                if (filterKey && key != filterKey) {
                    return;
                }
                if (!obj.persist && !overridePersist) {
                    return;
                }
                if (!obj.persist && overridePersist) {
                    Cache.temporary.push(obj.key);
                } else {
                    Cache.onSaveCallbacks.map((cb) => {
                        cb(key, objects[key].value);
                    });
                }
                Files.writeFile(Cache.file(key), JSON.stringify(obj), true, 'utf8');
                if (removeFromMemory) {
                    objects[key].value = null;
                    objects[key].length = 0;
                }
            });
        }

    /**
     * Sets a key within the cache file.
     * @param {String} key The key to set.
     * @param {*} val The value.
     * @param {Object} options (Optional) Options for the cache.  If provided,
     * sets the options for the object.
     */
    static set(key, val, options = {}, cwd) {
        if (!cwd) {
            cwd = process.cwd();
        }
        try {
            // console._log(require('ncli-core-files').getCallerFile(8));
        } catch(e) {
            // console.log(require('ncli-core-files').getCallerFile(2));
        }
        if (!Cache.objects[key]) {
            new Cache(key, val, options);
        }
        Cache.options(key, options);
        if (typeof val == 'object') {
            Cache.objects[key].length = JSON.stringify(val).length;
        } else {
            Cache.objects[key].length = val.toString().length;
        }
        Cache.objects[key].lastModified = (new Date()).getTime();
        Cache.objects[key].value = val;
        Cache.invalidate();
    }
}

Cache.objects = {};
Cache.configs = {};
const RScandir = require('ncli-core-rscandir/rscandir.class.js');
const Shutdown = require('ncli-core-helpers').Shutdown;
Shutdown.require(Cache.save, 'Saving cache to disk.');
RScandir.Cache = Cache;
Cache.onSaveCallbacks = [];
const Files = require('ncli-core-files');
Cache.files = Files;
const FileHelpers = require('ncli-core-files/filehelpers.class.js');
const FileScanner = require('ncli-core-files/filescanner.class.js');
let packageCache = FileHelpers.packagesCache;
let localFilesCache = FileScanner.filesCache;
FileHelpers.Cache = Cache;
FileScanner.Cache = Cache;
Cache.set('localFiles', Object.assign(Cache.get('localFiles') || {}, localFilesCache.objects));
Cache.set('packages', Object.assign(Cache.get('packages') || {}, packageCache.objects));
Cache.onSave(FileHelpers.onSaveCache);
Cache.onSave(FileScanner.onSaveCache);
Cache.configs = require('ncli-core-configs');
Cache.read();
module.exports = Cache;