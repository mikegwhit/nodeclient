'use strict';
delete require.cache[module.filename];
try {
    const mainDirectory = require('ncli-core-files').getMainDirectory();
    const currentPackageDirectory = require('ncli-core-files')
        .getPackageDirectory(require('ncli-core-files').getCallerFile(1));
    if (currentPackageDirectory != process.cwd()) {
        // Usually inside a lifecycle script, these are different.
        const cwd = process.cwd();
        process.chdir(currentPackageDirectory);
        console.log(process.cwd());
        let configs = require(__dirname + '/configs.class.js')
            .readConfigs('configs', null, null, true);
        process.chdir(mainDirectory);
        Object.assign(configs, require(__dirname + '/configs.class.js')
            .readConfigs());
        process.chdir(cwd);
        module.exports = configs;
    } else {
        module.exports = require(__dirname + '/configs.class.js')
            .readConfigs();
    }
} catch(e) {
    module.exports = require(__dirname + '/configs.class.js')
        .readConfigs();
}