
//@ts-check

import { isPromise } from "util/types";
import { FluxjectError } from "./errors.js";

/**
 * @template {object} TInstanceType
 */
export class LazyReference {
    /** @type {TInstanceType|undefined} */
    #instance;

    /**
     * Create a new lazy reference to an instance
     * @param {() => TInstanceType} instantiator 
     * The function that will be used to instantiate the reference.
     * @param {boolean} isTransient
     * True if the reference is transient (will be disposed of after property de-referencing)
     */
    constructor(instantiator, isTransient) {
        this.#instance = undefined;
        return new Proxy(this, {
            get: (target,property,receiver) => {
                if(isTransient) {
                    return this.#__handleTransient(instantiator, property);
                }

                if(this.#instance === undefined) {
                    // Prevent users from accessing the dispose methods.
                    if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                        return undefined;
                    }
                    const instance = instantiator();
                    if(isPromise(instance)) {
                        return instance.then(instance => {
                            this.#instance = /** @type {any} */ (instance);
                            return this;
                        });
                    }
                    this.#instance = instance;
                }
                const val = this.#instance[property];
                if(val instanceof Function) {
                    // Requested property is a function, bind the function to the instance.
                    return val.bind(this.#instance);
                }
                // Requested property is not a function, return the value.
                return val;
            },
            set: (target,property,value) => {
                if(isTransient) {
                    throw new FluxjectError(`Cannot set properties on a transient reference.`);
                }
                if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                    return false;
                }
                if(this.#instance === undefined) {
                    this.#instance = instantiator();
                }
                this.#instance[property] = value;
                return true;
            },
            has: (target,property) => {
                if(isTransient) {
                    throw new FluxjectError(`Cannot check for property existence on a transient reference.`);
                }
                if(this.#instance === undefined) {
                    if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                        throw new FluxjectError(`Cannot check for dispose methods.`);
                    }
                    this.#instance = instantiator();
                }
                return property in /** @type {any} */ (this.#instance);
            },
            getPrototypeOf: () => {
                if(isTransient) {
                    throw new FluxjectError(`Cannot get prototype of a transient reference.`);
                }
                if(this.#instance === undefined) {
                    this.#instance = instantiator();
                }
                return Object.getPrototypeOf(this.#instance);
            }
        });
    }

    /**
     * 
     * @param {() => TInstanceType} instantiator 
     * @param {string|symbol} property 
     * @returns 
     */
    #__handleTransient(instantiator, property) {
        if(property === Symbol.dispose || property === Symbol.asyncDispose) {
            return undefined;
        }
        const instance = instantiator();
        if(instance[property] instanceof Function) {
            return (...args) => {
                const returnValue = instance[property].bind(instance)(...args);
                if(isPromise(returnValue)) {
                    // Requested property is a function that returns a promise: 
                    //   Return the promise and dispose after resolution.
                    return returnValue.then(async (returnValue) => {
                        await instance[Symbol.dispose]?.();
                        await instance[Symbol.asyncDispose]?.();
                        return returnValue;
                    });
                }
                // Requested property is a function but not a promise: 
                //   Dispose and return the value.
                instance[Symbol.dispose]?.();
                instance[Symbol.asyncDispose]?.();
                return returnValue;
            }
        }
        // Requested property is not a function: 
        //   Dispose and return the value.
        const returnValue = instance[property];
        instance[Symbol.dispose]?.();
        instance[Symbol.asyncDispose]?.();
        return returnValue;
    }
}