'use strict';
delete require.cache[module.filename];
try {
    const currentPackageDirectory = require('ncli-core-files')
        .getPackageDirectory(require('ncli-core-files').getCallerFile(1));
    if (currentPackageDirectory != process.cwd()) {
        // Usually inside a lifecycle script, these are different.
        const cwd = process.cwd();
        process.chdir(currentPackageDirectory);
        let configs = require(__dirname + '/configs.class.js')
            .readConfigs('configs', null, null, true);
        process.chdir(cwd);
        Object.assign(configs, require(__dirname + '/configs.class.js')
            .readConfigs());
        module.exports = configs;
    } else {
        module.exports = require(__dirname + '/configs.class.js')
            .readConfigs();
    }
} catch(e) {
    module.exports = require(__dirname + '/configs.class.js')
        .readConfigs();
}