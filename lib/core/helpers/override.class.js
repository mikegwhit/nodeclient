const chalk = require('chalk');
/**
 * Override allows functions to be overridden.  If need be, overridden functions
 * can be, "released" and restored to their original state as well.
 * @class
 */
class Override {
    /**
     * @param {String} originalFn The string name of the function.  This name
     * gets eval'd to acquire the reference.
     * @param {Function} newFn The function reference to overwrite the original
     * with.
     * @param {Object} context (Optional) The context.  If omitted the context
     * is grabbed from the original function.  If no context can be found, a 
     * null context is used.
     */
    constructor(originalFn, newFn = null, context = null, object = {}, ...otherObjects) {
        if (!Override.functions) {
            Override.functions = {};
        }
        if (Override.functions[originalFn]) {
            console.warn('Overriding function when override already exists.' +
                ' Wrapping existing override function.');
            if (newFn) {
                Override.functions[originalFn].wrap(newFn);
            }
            return Override.functions[originalFn];
        }

        if (Array.isArray(originalFn)) {
            this.originalObj = originalFn[0];
            this.originalObjKey = originalFn[1];
            originalFn = 'this.originalObj[this.originalObjKey]';
        }
        this.originalFn = eval(originalFn);
        this.name = originalFn;
        Override.functions[this.name] = this;
        this.chain = [this.originalFn];
        this.context = context;
        this.object = object;
        this.otherObjects = otherObjects;
        if (newFn) {
            this.wrap(newFn);
        }
    }

    /**
     * Releases the override, destroying references to the object and preventing
     * all further overrides from occurring.
     */
    release() {
        delete Override.functions[this.name];
        this.reset();
        this.name = '';
    }
    
    /**
     * Releases all functions from their overrides.
     */
    static releaseAll() {
        for (let name in Override.functions) {
            Override.functions[name].release();
        }
    }

    /**
     * Resets the wrapper.
     */
    reset() {
        this.chain.splice(1, this.chain.length - 1);
        try {
            eval(`${this.name} = this.originalFn`);
        } catch(e) {
        }
    }

    /**
     * Resets all overrides.
     */
    static resetAll() {
        for (let name in Override.functions) {
            Override.functions[name].reset();
        }
    }

    /**
     * Unwraps a layer off the chain and then sets the function to the next
     * chain item.
     */
    unwrap() {
        if (this.chain.length == 1) {
            return;
        }
        this.chain.pop();
        let newFn = this.chain[this.chain.length - 1];
        let oldFn = this.chain[this.chain.length - 2];
        this.set(oldFn, newFn);
    }

    /**
     * Wraps the original function with the newFn.  If originalFn has already 
     * been wrapped, then wraps the most recent wrapper function.
     * @param {Function} newFn The new function that will always be called with 
     * the chain function as the first parameter.
     */
    wrap(newFn) {
        let oldFn = this.chain[this.chain.length - 1];
        newFn = this.set(oldFn, newFn);
        if (newFn) {
            this.chain.push(newFn);
        }
    }

    /**
     * Sets the new override function.
     */
    set(oldFn, newFn) {
        // Need to name this as "d" to prevent errors during minification.
        let c = Object.assign(((function() {
            return (function() {
                return newFn.call(this, oldFn, ...arguments);
            }).bind(this);
        }).bind(this.context))(), this.object, ...this.otherObjects);
        try {
            eval(`${this.name} = c;`);
            return c;
        } catch(e) {}
        return false;
    }
}
Override.functions = {};

module.exports = Override;