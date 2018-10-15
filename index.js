/**
 * @fileoverview It is important to check if the .cache file exists in the
 * main directory.
 */

module.exports = {
    cache: require(__dirname + '/lib/core/cache'),
    configs: require(__dirname + '/lib/core/configs'),
    files: require(__dirname + '/lib/core/files'),
    logger: require(__dirname + '/lib/core/logger'),
    rscandir: require(__dirname + '/lib/core/rscandir')
};