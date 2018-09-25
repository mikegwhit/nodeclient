const FileHelpers = require(__dirname + '/filehelpers.class.js');

class FileWriter {
    /**
     * Creates a file using filepath irrespective if the directory exists or
     * not.
     * @param {string} filepath The filepath to write.
     * @param {string} contents The contents to write to the file with.
     */
    static addFile(filepath, contents) {
        FileWriter.writeFile(filepath, contents, false);
    }

    /**
     * Receives a JSON object of filepaths and corresponding contents.  Writes
     * the filepaths provided by the object's keys irrespective of if the
     * directories exist or not.
     * @param {Object} fileObject An object of keys as pathnames, and values as
     *     file contents.
     */
    static addFiles(fileObject) {
        let contents, file;
        for (file in fileObject) {
            contents = fileObject[file];
            FileWriter.addFile(file, contents);
        }
    }

    /**
     * Alias of copyFiles.
     */
    static copy() {
        return FileWriter.copyFiles.apply(null, arguments);
    }

    /**
     * Copies either a file or a directory to a destination.
     * @param {string} source The source filename or directory.
     * @param {string} destination The destination filename or directory.
     * @param {Object} options An options object that may include overwrite.
     * @return {Promise} A promise that resolves when the operation is complete,
     * rejects if the source file or directory does not exist.
     */
    static copyFiles(source, destination, options = {}) {
        return new Promise((resolve, reject) => {
            if (!require('fs').existsSync(source)) {
                reject();
            }
            require('fs-extra').copy(source, destination, options, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Creates a file.
     * @param  {string} fromFolder Folder name to use for files.
     * @param  {string} filename   Path to store file under fromFolder.
     * @param  {string} contents   Contents of the file.
     * @param  {string} packageName Package name to put file in.
     * @param  {boolean} temporary  If temporary, will be deleted on shutdown.
     */
    static createFile(fromFolder, filename, contents, packageName, temporary) {
        let path;
        path = '';
        if (packageName) {
            path += 'node_modules/' + packageName + '/';
            if (!require('fs').existsSync(path)) {
                console.error('Tried to create file under package that DNE', packageName,
                    path);
                return;
            }
        }
        let prefix = '';
        if (path.length > 0 || fromFolder.length > 0) {
            prefix = path  + fromFolder + '/';
        }
        if (require('fs').existsSync(prefix + filename)) {
            // console.warn('Tried to create file that already exists!', 
               // path  + fromFolder + '/' + filename);
            // return;
        }
        FileWriter.writeFile(prefix + filename, contents, 
            true, 'utf8', temporary);

        if ((path + fromFolder).length > 0) {
            filename = prefix + filename;
        }
    }

    /**
     * Creates a file
     * @param  {string} fromFolder Folder name to use for files.
     * @param  {string} filename   Path to store file under fromFolder.
     * @param  {string} contents   Contents of the file.
     * @param  {boolean} temporary  If temporary, will be deleted on shutdown.
     */
    static createLocalFile(fromFolder, filename, contents, temporary) {
        FileWriter.createFile(fromFolder, filename, contents, null, temporary);
    }

    /**
     * Creates a file
     * @param  {string} fromFolder Folder name to use for files.
     * @param  {string} filename   Path to store file under fromFolder.
     * @param  {string} contents   Contents of the file.
     * @param  {string} packageName Package name to put file in.
     * @param  {boolean} temporary  If temporary, will be deleted on shutdown.
     */
    static createPackageFile(fromFolder, filename, contents, packageName, temporary) {
        FileWriter.createFile(fromFolder, filename, contents, packageName, temporary);
    }

    static isTemporary(file) {
        return FileWriter.temporaryFiles.includes(FileHelpers.normalize(file));
    }

    /**
     * Alias of moveFiles.
     */
    static move() {
        return FileWriter.moveFiles.call(null, arguments);
    }

    /**
     * Moves either a file or a directory to a destination.
     * @param {string} source The source filename or directory.
     * @param {string} destination The destination filename or directory.
     * @param {Object} options An options object that may include overwrite.
     * @return {Promise} A promise that resolves when the operation is complete,
     * rejects if the source file or directory does not exist.
     */
    static moveFiles(source, destination, options = {}) {
        return new Promise((resolve, reject) => {
            if (!require('fs').existsSync(source)) {
                reject();
            }
            require('fs-extra').move(source, destination, options, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Removes temporarily  created files on shutdown.  Any folders created
     * explicitly for temporarily files are also removed.
     */
    static onShutdown() {
        let file;
        const promises = [];
        console.info('Cleaning up temporarily created files.');
        return new Promise((res, rej) => {
            try {
                for (file of FileWriter.temporaryFiles) {
                    if (require('fs').existsSync(file)) {
                        // Easy, single deletion.
                        require('fs').unlinkSync(file);
                    } else {
                        continue;
                    }
                    while (require('ncli-core-rscandir')(require('path')
                        .dirname(file)).length == 0) {
                            console.warn('Deleting folder with no files left', 
                                require('path').dirname(file));
                            try {
                                // Need async, else weird EPERM errors on Windows.
                                const removeFiles = (file, done) => {
                                    if (!require('fs').existsSync(require('path')
                                        .dirname(file))) {
                                        done();
                                        return;
                                    }
                                    try {
                                        require('child_process').execSync('rmdir --ignore-fail-on-non-empty "' + require('path')
                                            .dirname(file) + '"', {
                                                stdio: ['ignore', 'ignore', 'ignore']
                                            });
                                        done();
                                        return;
                                    } catch(e) {
                                        setTimeout(() => removeFiles(file, done));
                                    }
                                    try {
                                        require('fs').unlinkSync(require('path').dirname(file));
                                        done();
                                        return;
                                    } catch(e) {
                                        setTimeout(() => removeFiles(file, done));
                                    }
                                    try {
                                        require('rimraf').sync(require('path')
                                            .dirname(file));
                                        done();
                                        return;
                                    } catch(e) {
                                        setTimeout(() => removeFiles(file, done));
                                    }
                                }
                                promises.push(new Promise((resolve, reject) => {
                                    removeFiles(file, resolve);
                                }));
                                // Move up a directory now.
                                file = file.split('/').slice(0, -1)
                                    .join('/');
                            } catch(e) {
                                console.warn(e);
                                break;
                            }
                        }
                }
    
                Promise.all(promises).then(() => {
                    process.emit('files.cleanedUp');
                    res();
                });
            } catch(e) {
                console.warn(e);
            }
        });
    }

    /**
     * Sets the file to be temporary or not.
     */
    static setTemporary(file, isTemporary = true) {
        file = FileHelpers.normalize(file);
        if (!isTemporary && 
            FileWriter.temporaryFiles.includes(file)) {
            FileWriter.temporaryFiles
                .splice(FileWriter.temporaryFiles
                .indexOf(file), 1);
        } else if (isTemporary && 
            !FileWriter.temporaryFiles.includes(file)) {
            FileWriter.temporaryFiles.push(file);
        }
    }

    /**
     * Creates a file using filepath irrespective if the directory exists or
     * not.
     * @param {string} filepath The filepath to write.
     * @param {string} contents The contents to write to the file with.
     * @param {Boolean} overwrite If true, overwrites the file.  If false, does
     * not write if file exists.  Default is true.
     * @param {String} encoding The encoding to write the file with.  Defaults
     * to UTF8.
     */
    static writeFile(filepath, contents, overwrite = true, encoding = 'utf8',
        temporary = false) {
        let cwd, directories, filename;
        cwd = process.cwd();
        filepath = FileHelpers.normalize(filepath);
        directories = filepath.split('/');
        filename = directories.pop();
        process.chdir('/'); // Goto root directory.
        for (let dir of directories) {
            if (dir.length == 0) {
                continue;
            }
            if (!require('fs').existsSync(dir)) {
                require('fs').mkdirSync(dir);
            }
            process.chdir(dir);
        }
        if (!overwrite && require('fs').existsSync(filename)) {
            // Do nothing.
        } else {
            try {
                require('fs').writeFileSync(process.cwd() + '/' + filename, 
                    contents, encoding);
            } catch(e) {
                console.log(e);
            }
        }

        if (temporary && !FileWriter.temporaryFiles.includes(FileHelpers.normalize(process.cwd() + '/' + filename))) {
            // Store this so we delete it at exit.
            FileWriter.temporaryFiles.push(FileHelpers.normalize(process.cwd() + '/' + filename));
        } else if (!temporary) {
            try {
                FileWriter.temporaryFiles
                    .splice(FileWriter.temporaryFiles
                    .indexOf(FileHelpers.normalize(process.cwd() + '/' + filename)), 1);
            } catch(e) {
            }
        }

        process.chdir(cwd);
    }
}
FileWriter.temporaryFiles = [];
process.on('files cleanup', FileWriter.onShutdown);
process.on('files.cleanup', FileWriter.onShutdown);
require('ncli-core-helpers').Shutdown.require(FileWriter.onShutdown);
module.exports = FileWriter;