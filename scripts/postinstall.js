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
                if (process.platform != 'win32') {
                    cp.exec(`ln -s "${require('path').resolve(dir)}" ` + 
                        `"${process.env['HOME']}/.node_modules/${pkgJSON['name']}"`, 
                        {encoding: 'utf8', stdio: 'ignore'}).on('close', () => {
                            resolve();
                        });
                } else {
                    const prefix = (new Buffer(cp.execSync(`npm config get prefix`)).toString('utf8')).trim().replace(/\\/g, '/');
                    const home = (new Buffer(cp.execSync(`echo %HOMEPATH%`)).toString('utf8')).trim().replace(/\\/g, '/');
                    cp.execSync(`rm -rf "${home}/.node_modules/${pkgJSON['name']}"`);
                    cp.execSync(`mklink /D "${home}/.node_modules/${pkgJSON['name']}" "${prefix}/node_modules/${pkgJSON['name']}"`);
                    resolve();
                }
                
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
    let packageName = pkg.split('/').pop();
    try {
        const pkgJSON = 
            JSON.parse(require('fs').readFileSync(pkg + '/package.json', 'utf8'));
        packageName = pkgJSON['name'];
    } catch(e) {
    }
    if (!progress) {
        initProgress(packages.length, '');
        progress.tick({label: packageName});
        promises.push(installPackage(pkg));
    } else {
        const promise = installPackage(pkg);
        promise.then(() => {
            progress.tick({label: packageName});
        });
        promises.push(promise);
    }

});
Promise.all(promises).then(() => {
    progress.tick({label: chalk.green('Done')});
    try {
        // Remove the Nodeclient libraries first.
        try {
            require('fs')
                .unlinkSync(`"${process.env['HOME']}/.node_modules/nodeclient`);
        } catch(e) {
            try {
                cp.execSync(`rm -rf "${process.env['HOME']}/.node_modules/nodeclient"`);
            } catch(e) {}
        }
        if (process.platform != 'win32') {
            cp.execSync(`ln -s "${require('path').resolve(__dirname + '/../')}" ` + 
                `"${process.env['HOME']}/.node_modules/nodeclient"`)
        } else {
            const prefix = (new Buffer(cp.execSync(`npm config get prefix`)).toString('utf8')).trim().replace(/\\/g, '/');
            const home = (new Buffer(cp.execSync(`echo %HOMEPATH%`)).toString('utf8')).trim().replace(/\\/g, '/');
            cp.execSync(`rm -rf "${home}/.node_modules/nodeclient"`);
            cp.execSync(`mklink /D "${home}/.node_modules/nodeclient" "${prefix}/node_modules/nodeclient"`);
        }
    } catch(e) {
    }
    process.exit();
});