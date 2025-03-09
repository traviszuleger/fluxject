//@ts-check

/**
 * Check if a value is a constructor without invoking it.
 * @param {any} instantiator 
 * The value to check if it is a constructor.
 * @returns {instantiator is { new (...args: any[]): any }}
 * True if the value is a constructor, false otherwise.
 */
export function isConstructor(instantiator) {
    const handler = {
        construct() {
            return handler;
        }
    };

    try {
        return !!(new /** @type {any} */ (new Proxy(instantiator, handler))());
    } 
    catch (e) {
        return false;
    }
}