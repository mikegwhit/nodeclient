/**
 * @fileoverview Adds .logs to the .gitignore file.
 */

const addIgnoreEntries = (file) => {
    let contents = '';
    if (require('fs').existsSync(file)) {
        contents = require('fs').readFileSync(file, 'utf8');
    }
    if (!contents.includes('.logs')) {
        contents += '\n.logs\n';
    }
    require('fs').writeFileSync(file, contents, 'utf8');
};

console.log('adding ignores', process.cwd());
addIgnoreEntries(__dirname + '/../.gitignore');
addIgnoreEntries(process.cwd() + '/.gitignore');