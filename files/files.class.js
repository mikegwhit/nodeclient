'use strict';

/**
 * @class
 * Files allows folders to be recursively read, and it uses a cache to prevent 
 * unnecessary reads when no modifications have been made.
 * 
 * @todo Add whitelist/blacklist for packages.
 */
class Files {
    constructor() {
        if (!Files.instance) {
            Files.instance = this;
        } else {
            return Files.instance;
        }
        // TODO: reimplement.
        // this.lastRead = {};
        // this.updateIntervalIds = {};
        // this.updateIntervals = {};
        // this.updateFns = {};
        const fileHelpers = require(__dirname + '/filehelpers.class.js');
        const fileScanner = require(__dirname + '/filescanner.class.js');
        const fileWriter = require(__dirname + '/filewriter.class.js');
        [fileHelpers, fileScanner, fileWriter].map((obj) => {
            Object.getOwnPropertyNames(obj).map((name) => {
                this[name] = obj[name];
            });
        });
    }

    /**
     * Flattens dependencies into dest directory package.
     */
    flattenDependencies(dest, packages = []) {
        let finalPkg = Files.instance.getPackageObject(dest);
        if (!finalPkg['dependencies']) {
            finalPkg['dependencies'] = {};
        }
        Files.instance.getPackages().map((pkg) => {
            let cwd = process.cwd();
            process.chdir(pkg);
            const pkgObj = Files.instance.getPackageObject();
            process.chdir(cwd);
            if (packages.length > 0 && !packages.includes(pkgObj['name'])) {
                return;
            }
            Object.assign(finalPkg['dependencies'], pkgObj['dependencies']);
        });
        packages.map((pkg) => {
            delete finalPkg['dependencies'][pkg];
        });
        finalPkg['flattenedDependencies'] = packages;
        Files.instance.writeFile(dest + '/package.json', 
            JSON.stringify(finalPkg, null, 2));
    }

    /**
     * Given a folder name, "flattens" the filesystem such that all modules
     * are copied to FOLDER_NAME/PACKAGE_NAME/FILE.  This allows bundling and
     * packaging to occur.
     */
    flatten(folder, dest, packages = []) {
        if (Array.isArray(folder)) {
            folder.map((f) => {
                Files.instance.flatten(f, dest, packages);
            });
            return;
        }
        const finalPkg = Files.instance.getPackageObject(dest);
        Files.instance.getPackages().map((pkg) => {
            let cwd = process.cwd();
            process.chdir(pkg);
            const pkgObj = Files.instance.getPackageObject();
            let files = Files.instance.readLocalFiles(folder).map((file) => {
                return [file.substr(folder.length + 1), process.cwd() + '/' + file];
            });
            process.chdir(cwd);
            if (packages.length > 0 && !packages.includes(pkgObj['name'])) {
                return;
            }
            files.map(([file, src]) => {
                let contents = require('fs').readFileSync(src, 'utf8');
                let pkgName = pkgObj['name'].split('-').reduce((name, pkgNameToken, idx) => {
                    if (!name && (finalPkg['name'].split('-').length <= idx ||
                        finalPkg['name'].split('-')[idx] != pkgNameToken)) {
                            name = pkgNameToken;
                        } else if (!!name) {
                            name += '/' + pkgNameToken;
                        }
                    return name;
                }, false);
                if (file.endsWith('js')) {
                    contents = `require(__dirname + '/../../index.js');
(() => {
${contents.replace(/\/\.\.\//g, '/../../').replace(/index\.js/g, `${pkgName}.js`)}
})();`
                }
                Files.instance.writeFile(`${dest}/${folder}/${pkgName}/${file}`, contents);
            });
        });
    }
}

module.exports = Files;