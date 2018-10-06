/**
 * @fileoverview This file combats weird NPM and Yarn errors relating to local
 * filesystem lib.  What it does is delete the lock files, redownload the 
 * dependencies IN ORDER such that the lowest dependency is rebuilt first.  It 
 * seemed like once a low-level dependency had been corrupted other installs 
 * would fail.  This script solves for that.
 */
const cp = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const ProgressBar = require('progress');

let progress = null;
const initProgress = (total, name) => {
    progress = new ProgressBar(':bar ' +
        chalk.grey('(:current/:total packages) ') + chalk.yellow(':label'), {
            label: name,
            total,
            width: 40
        });
};

const installPackage = (dir) => {
    const cwd = process.cwd();
    process.chdir(dir);
    return new Promise((resolve, reject) => {
        const pkgJSON = 
            JSON.parse(require('fs').readFileSync(dir + '/package.json', 'utf8'));
        try {
            cp.exec(`npm i ${dir} --save`).on('close', () => {
                try {
                    require('fs')
                        .rmdirSync(`"${process.env['HOME']}/.node_modules/` +
                        `${pkgJSON['name']}"`);
                } catch(e) {}
                cp.exec(`ln -s "${require('path').resolve(dir)}" ` + 
                    `"${process.env['HOME']}/.node_modules/${pkgJSON['name']}"`, 
                    {encoding: 'utf8', stdio: 'ignore'}).on('close', () => {
                        resolve();
                    });
            });
        } catch(e) {
            resolve();
        }
    });
}
let packages = [
    __dirname + '/../lib/core/rscandir',
    __dirname + '/../lib/core/files',
    __dirname + '/../lib/core/helpers',
    __dirname + '/../lib/core/configs',
    __dirname + '/../lib/core/cache',
    __dirname + '/../lib/core/logger',
    __dirname + '/../lib/core/console',
    __dirname + '/../lib/core/scripts'
];
let promises = [];
if (!require('fs').existsSync(`${process.env['HOME']}/.node_modules`)) {
    require('fs').mkdirSync(`${process.env['HOME']}/.node_modules`);
}
console.log(chalk.cyan('Installing Nodeclient core'));
packages.map((pkg) => {
    if (!progress) {
        initProgress(packages.length, '');
        progress.tick({label: ''});
    }
    let packageName = pkg.split('/').pop();
    try {
        const pkgJSON = 
            JSON.parse(require('fs').readFileSync(pkg + '/package.json', 'utf8'));
        packageName = pkgJSON['name']; /* || pkgJSON['name']; */
    } catch(e) {
    }
    let promise = installPackage(pkg);
    promise.then(() => {
        progress.tick({label: packageName});
    });
    promises.push(installPackage(pkg));
});
/*
const packageJSON = 
    JSON.parse(require('fs').readFileSync(__dirname + '/../package.json'));
packageJSON['dependencies'] = packageJSON['localDependencies'];
packageJSON['scripts'] = {
    'postinstall': 'node scripts/postinstall.js'
};
require('fs').writeFileSync(__dirname + '/../package.json', 
    JSON.stringify(packageJSON, null, 2));
*/
// symlink the Nodeclient, and then each package directory.
// safeInstall(__dirname + '/../');
Promise.all(promises).then(() => {
    try {
        try {
            require('fs')
                .unlinkSync(`"${process.env['HOME']}/.node_modules/nodeclient`);
        } catch(e) {
            try {
                cp.execSync(`rm -rf "${process.env['HOME']}/.node_modules/nodeclient"`);
            } catch(e) {}
        }
        console.log(`ln -s "${require('path').resolve(__dirname + '/../')}" ` + 
        `"${process.env['HOME']}/.node_modules/nodeclient"`)
        cp.execSync(`ln -s "${require('path').resolve(__dirname + '/../')}" ` + 
            `"${process.env['HOME']}/.node_modules/nodeclient"`)
    } catch(e) {
    }
    process.exit();
});