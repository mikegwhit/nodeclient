/**
 * Class transposes files from scripts/* path and adds them to active
 * package.json on installation.
 * 
 * Scripts may have the same name.  Lifecycle scripts are run through this 
 * package and then initiated on other packages.  As a result, lifecycle script
 * execution order is maintained.
 * 
 * If you need to maintain dependency chain order for lifecycle scripts, it's
 * recommended to utilize NPM hooks directly.  Set the `ignoreLifecycleScripts`
 * to include an entry either with the packageName or with the package/script 
 * format.
 * 
 * @class
 */
class Scripts {
    constructor() {
        if (Scripts.instance) {
            return Scripts.instance;
        }
        Scripts.instance = this;

        this.console = require('ncli-core-console');
        this.cache = require('ncli-core-cache');
        this.configs = require('ncli-core-configs');
        /*
        const cwd = process.cwd();
        process.chdir(__dirname);
        this.configs = Object.assign(this.configs, 
            require('ncli-core-configs/configs.class.js').readConfigs());
        process.chdir(cwd);
        */

        this.files = require('ncli-core-files');
        this.minimist =  require('minimist')(process.argv.slice(2));

        // TODO: Read from cache if exists.

        // ELSE: Write some console logs regarding the gathering of packages.
        this.packages = this.files.getPackageNames();
        
        /**
         * @description Object of script names and file paths, keyed by module.
         * @type {Object<String, Object>}
         */
        this.scripts = this.getScripts();
        if (this.minimist['ignoreNodeModules']) {
            const value = this.minimist['ignoreNodeModules'] === 'true' || 
            this.minimist['ignoreNodeModules'] === 1 || 
            this.minimist['ignoreNodeModules'] === '1';
            this.configs['scripts']['ignoreNodeModules'] = value;
        }

        if (this.minimist['_'].length > 0) {
            this.minimist['_'].map((script) => {
                script = script.split('/');
                const packageName = script.length > 1 ? script[0] : '';
                const scriptName = script.length > 1 ? script[1] : script[0];
                this.initialExecution = this.execute(scriptName, packageName, 
                    this.configs['scripts']['ignoreNodeModules']);
            });
        }
    }

    /**
     * Given a module/script format, executes the script.  If no module is 
     * provided, executes the given script across all modules.
     * @param {String} script The script name to execute.
     * @param {String} packageName The package name to scope execution to.
     * @param {Boolean} ignoreNodeModules If true, only pulls scripts from 
     * non-node_modules folders.
     * @return {Promise} A promise that resolves when all executed scripts have
     * completed successfully, and rejects when one or more scripts have failed.
     */
    execute(script, packageName = '', ignoreNodeModules = true) {
        const localPackageName = this.files.getPackageName();
        const localPackageDir = this.files.getPackageDirectory();

        let packages = this.packages;
        packages[localPackageName] = localPackageDir;

        if (packageName == '') {
            let promises = [];
            for (let packageName in packages) {
                if (this.scripts[packageName] && 
                    this.scripts[packageName][script]) {
                    const tokens = this.scripts[packageName][script].split(' ');
                    tokens[0] = this.files.getFile(tokens[0]) || tokens[0];
                    promises.push(this.executeScript(tokens[0], 
                        tokens.slice(1), packages[packageName]));
                }
            }

            return Promise.all(promises);
        } else if (this.scripts[packageName] && 
            this.scripts[packageName][script]) {
                const tokens = this.scripts[packageName][script].split(' ');
                tokens[0] = this.files.getFile(tokens[0]) || tokens[0];
                return this.executeScript(tokens[0], 
                    tokens.slice(1), packages[packageName]);
            } else {
                return new Promise((resolve) => resolve());
            }
    }

    /**
     * Executes a script given a specific module path and arguments to pass 
     * into a forked process.
     * @param {String} modulePath The path to execute when forking Node.js 
     * process.
     * @param {*} args Arguments to pass into the script.
     * @param {String} dir The directory to execute under.
     * @return {Promise} A promise that resolves when the process correctly 
     * executes and closes.
     */
    executeScript(modulePath, args, dir) {
        return new Promise((resolve, reject) => {
            const cwd = process.cwd();
            process.chdir(dir);
            const stream = require('child_process')
                .fork(modulePath, args, {
                    silent: true
                });
            stream.on('close', (code) => {
                if (code > 0) {
                    reject(code);
                } else {
                    resolve();
                }
            });
            stream.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            stream.on('error', (...args) => {
                reject();
            });
            process.chdir(cwd);
        });
    }
    
    /**
     * Gets all the scripts.  
     * @returns {Object<String, Object>} Object of script names and file paths,
     * keyed by module.
     */
    getScripts() {
        let scripts = {};
        const packages = this.packages;
        for (let packageName in packages) {
            try {
                const packageScripts = this.files
                    .getPackageObject(packages[packageName])['scripts'];
                for (let script in packageScripts) {
                    if (!scripts[packageName]) {
                        scripts[packageName] = {};
                    }
                    // if (Scripts.isLifecycleScript(script)) {
                        // TODO: Change cwd to match the package location.
                        scripts[packageName][script] = packageScripts[script];
                    // }
                }
                const cwd = process.cwd();
                process.chdir(packages[packageName]);
                // Read all scripts for this package.
                const fileScripts = this.files.readLocalFiles('scripts');
                process.chdir(cwd);
                for (let file of fileScripts) {
                    if (!scripts[packageName]) {
                        scripts[packageName] = {};
                    }
                    const filename = require('path').basename(file)
                        .split('.').slice(0, -1);
                    if (scripts[packageName][filename]) {
                        scripts[packageName][filename] = 
                            [scripts[packageName][filename], 
                            `${packageName}/scripts/${filename}.js`];
                    } else {
                        scripts[packageName][filename] = 
                            `${packageName}/scripts/${filename}.js`;   
                    }
                }
            } catch(err) {
                console.warn(err);
            }
        }
        
        const localFileScripts = this.files.readLocalFiles('scripts');
        const localPackageName = this.files.getPackageName()
        scripts[localPackageName] = {};
        for (let file of localFileScripts) {
            const filename = require('path').basename(file)
                .split('.').slice(0, -1);
            scripts[localPackageName][filename] = `${localPackageName}/scripts/${filename}.js`;
        }

        return scripts;
    }

    /**
     * Returns true if is a lifecycle script.  If true, usually implies a script
     * is to be added as part of a default behavior.
     */
    static isLifecycleScript(name) {
        name = require('path').parse(name).name;
        switch (name) {
            case 'install':
            case 'preinstall':
            case 'postinstall':
            case 'publish':
            case 'prepublish':
            case 'postpublish':
            case 'pack':
            case 'prepack':
            case 'postpack':
            case 'uninstall':
            case 'preuninstall':
            case 'postuninstall':
            case 'version':
            case 'preversion':
            case 'postversion':
            case 'test':
            case 'pretest':
            case 'posttest':
            case 'start':
            case 'prestart':
            case 'poststart':
            case 'restart':
            case 'prerestart':
            case 'postrestart':
            case 'shrinkwrap':
            case 'preshrinkwrap':
            case 'postshrinkwrap':
                return true;
            default:
                return false;
        }
    }
}

module.exports = Scripts;