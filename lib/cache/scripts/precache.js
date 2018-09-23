/**
 * @fileoverview This script precache's all of the folders in the currently
 * installing package.  It writes the cache file to .cache.
 * 
 * Each time an installation or occurs, the precache step should be re-run.
 */

 const files = require('ncli-core-files');
 const configs = require('ncli-core-configs');
 try {
     configs['cache']['folders'].map((folder) => {
        const folderFiles = files.readFiles(folder);
    });
} catch(e) {

}