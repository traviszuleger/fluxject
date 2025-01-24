//@ts-check
/** @import { ClassType, FactoryType, StaticType } from "./types.js" */

/** @readonly */
const AsyncFunction = (async () => {}).constructor;

/**
 * Check if the given function, `fn`, is a constructor.
 * @param {Function} fn 
 * Function to check.
 * @returns {fn is ClassType}
 * True if the function is a constructor, otherwise false.
 */
export function isConstructor(fn) {
    if(typeof fn !== "function") {
        return false;
    }
    if(fn instanceof AsyncFunction) {
        return false;
    }
    const prototype = fn.prototype;
    return prototype && typeof prototype === 'object' && prototype.constructor === fn;
}

/**
 * @param {ClassType|FactoryType|StaticType} fn
 */
export function getInstantiateFunction(fn) {
    if(isConstructor(fn)) {
        return services => {
            return new fn(services);
        }
    }
    if(fn instanceof AsyncFunction) {
        return async services => await /** @type {any} */ (fn)(services);
    }
    if(typeof fn === "function") {
        return services => fn(services);
    }
    return () => fn;
}

/**
 * @param {any} obj 
 * @param {string} key 
 * @returns {any}
 */
export function omitKey(obj, key) {
    const { [key]: omit, ...rest } = obj;
    return rest;
}