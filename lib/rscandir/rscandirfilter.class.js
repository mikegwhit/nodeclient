/**
 * @class
 * Filter object allows wildcard, RegEx, minimatch pattern matching.
 * @todo Use map-style functional iterators.
 */
 class RScandirFilter {
     /**
      * @param {Array} filelist The list of files to filter.
      * @param {String|RegExp|{pattern: String|RegExp, exclude: Boolean, type: String}} filter 
      * If is a string, is a filter for wildstring/minimatch.  If is a RegExp, 
      * performs a match.  Exclude option may be set as an object.
      */
    constructor(filelist, filter) {
        /**
         * @type {Array} The input list of files.
         */
        this.filelist = filelist;

        /**
         * @type {Boolean} If true, the filter acts as an exclusion filter
         * instead of an inclusion filter. 
         */
        this.exclude = false;

        /**
         * @type {Array} The filtered list of files.
         */
        this.filtered = [];

        /**
         * @type {String} The pattern to match.
         */
        this.pattern = '*';

        /**
         * @type {String} The type of match to perform.
         */
        this.type = 'wildstring';
        
        if (typeof filter == 'object') {
            Object.assign(this, filter);
        }
        if (typeof filter != 'object' || !filter.type) {
            if (typeof filter != 'object') {
                this.pattern = filter;
            }
            if (this.pattern.exec) {
                this.type = 'regex';
            } else if (this.pattern.includes('**')) {
                this.type = 'glob';
            } else if (this.pattern.includes('*')) {
                this.type = 'wildstring';
            } else {
                // TODO: Should this happen?
                this.pattern = '*/' + this.pattern;
                this.type = 'wildstring';
            }
        }

        for (let file of this.filelist) {
            const match = this.match(file);
            if (match && !this.exclude) {
                this.filtered.push(file);
            } else if (!match && this.exclude) {
                this.filtered.push(file);
            }
        }
    }     

    static exec(filelist, filter) {
        return (new RScandirFilter(filelist, filter)).filtered;
    }

    /**
     * Pattern match.
     * @return {Boolean} True if file matches pattern using configured method.
     */
    match(file) {
        if (!file) {
            return false;
        }
        switch (this.type) {
            case 'glob':
                return require('minimatch')(file, this.pattern);
            break;
            case 'regex':
                return file.match(this.pattern);
            break;
            case 'wildstring':
                return require('wildstring').match(this.pattern, file);
            break;
        }
    }
 }

 module.exports = RScandirFilter;