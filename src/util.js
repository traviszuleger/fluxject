//@ts-check

/** @readonly */
const AsyncFunction = (async () => {}).constructor;

/**
 * Check if the given function, `fn`, is a constructor.
 * 
 * This will not invoke the constructor
 * @param {any} fn 
 * Function to check.
 * @returns {fn is (new (...args: any[]) => any)}
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