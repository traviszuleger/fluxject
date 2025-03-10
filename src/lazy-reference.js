
//@ts-check
import { isPromise } from "util/types";
import { isConstructor } from "./util.js";
import { FluxjectError } from "./errors.js";

export const INSTANCE = Symbol("Fluxject__Instance");

/**
 * Object that allows for services to be lazily instantiated.
 * 
 *   - Singleton and Scoped services will store their instance after the first property access.
 *   - Transient services will dispose of their instance immediately after the first property access.
 *     - If the property accessor was a function, the instance will be disposed of after the function is invoked.
 * @template TInstanceType
 */
export class LazyReference {
    /** 
     * The actual instance of the service.
     * 
     * Stored under a symbol to prevent accidental access.
     * @type {TInstanceType|undefined} 
     */
    [INSTANCE];

    /**
     * True if the service has been asynchronously disposed of. 
     * @type {boolean} 
     */
    #asyncDisposed;

    /**
     * True if the service has been synchronously disposed of. 
     * @type {boolean} 
     */
    #syncDisposed;

    /**
     * Proxied `this` object, that intercepts properties and ensures instantation before actual property accessors are invoked.
     */
    #proxy;

    /**
     * True if the service is transient.
     */
    #isTransient;

    /**
     * Create a new lazy reference to an instance
     * @param {() => TInstanceType} instantiator 
     * The function that will be used to instantiate the reference.
     * @param {boolean} isTransient
     * True if the reference is transient (will be disposed of after property de-referencing)
     */
    constructor(instantiator, isTransient) {
        this.#syncDisposed = false;
        this[INSTANCE] = undefined;
        this.#isTransient = isTransient;
        this.#proxy = this.#createProxy(instantiator);
        return this.#proxy;
    }

    /**
     * Creates a Proxy for this object that intercepts property accessors and ensures that the instance is instantiated before access.
     * @param {() => TInstanceType} instantiator 
     * The function that will be used to instantiate the reference.
     */
    #createProxy(instantiator) {
        return new Proxy(this, {
            /**
             * Trap for getting properties, while instantiating if necessary, on the service.
             */
            get: (target,property,receiver) => {
                if(property in target) {
                    return target[property];
                }
                // If the service has already been fully disposed, return undefined.
                if(this.#syncDisposed && this.#asyncDisposed) {
                    return undefined;
                }

                // If the service is a Transient service, then they will undergo a different process.
                if(this.#isTransient) {
                    return this.#handleTransient(instantiator, property);
                }

                // If the property is a synchronous dispose method, then track that this service is disposed (synchronously).
                if(property === Symbol.dispose) {
                    this.#syncDisposed = true;
                    // Prevent users from disposing an instance that has not been instantiated yet.
                    if(this[INSTANCE] === undefined) {
                        return undefined;
                    }
                }

                // If the property is an asynchronous dispose method, then track that this service is disposed (asynchronously).
                if(property === Symbol.asyncDispose) {
                    this.#asyncDisposed = true;
                    // Prevent users from disposing an instance that has not been instantiated yet.
                    if(this[INSTANCE] === undefined) {
                        return undefined;
                    }
                }

                // If the instance has not been instantiated yet, then instantiate it.
                if(this[INSTANCE] === undefined) {
                    this[INSTANCE] = instantiator();
                }

                // If the instance is a promise and the property is not `then`, then return undefined.
                if(isPromise(this[INSTANCE]) 
                    && property !== "then"
                    && property !== "catch"
                    && property !== "finally"
                ) {
                    return undefined;
                }
                
                // Get the value of the property.
                const val = this[INSTANCE][property];
                
                // If the value is a function, bind the function to the instance.
                if(val instanceof Function) {
                    return (...args) => {
                        const returnValue = val.bind(this[INSTANCE])(...args);

                        // If the return value is a reference to this service, then return this reference.
                        //   This is to ensure that if the provider is disposed, the user cannot accidentally
                        //   reference data that may no longer exists.
                        if(returnValue === this[INSTANCE]) {
                            return this.#proxy;
                        }
                        return returnValue;
                    }
                }

                // If the value is a reference to this service, then return this reference.
                //   This is to ensure that if the provider is disposed, the user cannot accidentally
                //   reference data that may no longer exists.
                if(val === this[INSTANCE]) {
                    return this.#proxy;
                }

                // Requested property is not a function, return the value.
                return val;
            },
            /**
             * Trap for setting properties, while instantiating if necessary, on the service.
             */
            set: (target,property,value) => {
                if(property in target) {
                    target[property] = value;
                    return true;
                }
                // If the service is transient, then throw an error.
                if(this.#isTransient) {
                    throw new FluxjectError(`Cannot set properties on a transient reference.`);
                }

                // If the property is a dispose method, then throw an error. 
                if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                    throw new FluxjectError(`Cannot set dispose methods on services.`);
                }

                // If the instance has not been instantiated yet, then instantiate it.
                if(this[INSTANCE] === undefined) {
                    this[INSTANCE] = instantiator();
                }

                // Set the property on the instance.
                this[INSTANCE][property] = value;
                return true;
            },
            /**
             * Trap for checking if a property exists, while instantiating if necessary, on the service.
             */
            has: (target,property) => {
                // If the service is transient, then throw an error.
                if(this.#isTransient) {
                    throw new FluxjectError(`Cannot check for property existence on a transient reference.`);
                }

                // If the instance has not been instantiated yet, then instantiate it.
                if(this[INSTANCE] === undefined) {
                    // If the property is a dispose method, then throw an error.
                    if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                        throw new FluxjectError(`Cannot check for dispose methods.`);
                    }
                    this[INSTANCE] = instantiator();
                }

                // Check if the property exists on the instance.
                return property in /** @type {any} */ (this[INSTANCE]);
            },
            /**
             * Trap for getting the prototype, while instantiating if necessary, of the service.
             */
            getPrototypeOf: (target) => {
                // If the service is transient, then return false (transient services do not have prototypes).
                if(this.#isTransient) {
                    return false;
                }

                // If the instance has not been instantiated yet, then instantiate it.
                if(this[INSTANCE] === undefined) {
                    this[INSTANCE] = instantiator();
                }
                
                // Return the prototype of the instance.
                return Object.getPrototypeOf(this[INSTANCE]);
            },
            /**
             * Trap for constructing the return value, while instantiating if necessary, of the service.
             */
            construct: (target, args, newTarget) => {
                // If the instance has not been instantiated yet, then instantiate it.
                if(this[INSTANCE] === undefined) {
                    this[INSTANCE] = instantiator();
                }

                // If the instance is not a constructable type, then throw an error.
                if(!isConstructor(this[INSTANCE])) {
                    // If `new` is attempted a non constructable instance, throw an error.
                    throw new FluxjectError(`Cannot construct a non-constructor instance.`);
                }

                // If the instance is a constructable type, construct and return it.
                return new this[INSTANCE](...args);
            }
        });
    }

    /**
     * Handles the get trap for transient services.
     * @param {() => TInstanceType} instantiator 
     * Instantiation function that will return the service.
     * @param {string|symbol} property 
     * The property that is being requested from the service.
     */
    #handleTransient(instantiator, property) {
        // Transient services are instantiated and disposed of after every usage.
        //   This just ensures that the service isn't storing data between usages.
        this.#asyncDisposed = false;
        this.#syncDisposed = false;
        this[INSTANCE] = undefined;
        
        // If the property is a dispose method, then return undefined.
        if(property === Symbol.dispose || property === Symbol.asyncDispose) {
            return undefined;
        }

        // If the property is an attempt to await a promise, then return the proxy.
        //   
        if(property === "then") {
            return this.#proxy;
        }

        // If the instance has not been instantiated yet, then instantiate it.
        const instance = instantiator();

        // If the value is a function, return a function will dispose of the instance after invocation.
        if(instance[property] instanceof Function) {
            return (...args) => {
                // Bind and invoke, intercepting the return value.
                const returnValue = instance[property].bind(instance)(...args);

                // If the return value is a promise, then chain the disposal of the instance after resolution.
                if(isPromise(returnValue)) {
                    return returnValue.then(async (promiseReturnValue) => {
                        instance[Symbol.dispose]?.();
                        await instance[Symbol.asyncDispose]?.();

                        // If the return value is the instance itself, then return this reference
                        //   This is to ensure that the service does not become stated.
                        if(promiseReturnValue === instance) {
                            return this.#proxy;
                        }
                        return promiseReturnValue;
                    });
                }

                // Otherwise, the return value is not a promise, so dispose of the instance and return the value.
                instance[Symbol.dispose]?.();
                instance[Symbol.asyncDispose]?.();

                // If the return value is the instance itself, then return this reference
                //   This is to ensure that the service does not become stated.
                if(returnValue === instance) {
                    return this.#proxy;
                }
                return returnValue;
            }
        }
        // Otherwise, the value is not a function, so dispose of the instance and return the value.
        const returnValue = instance[property];
        instance[Symbol.dispose]?.();
        instance[Symbol.asyncDispose]?.();
        
        // If the return value is the instance itself, then return this reference
        //   This is to ensure that the service does not become stated.
        if(returnValue === instance) {
            return this.#proxy;
        }
        return returnValue;
    }
}